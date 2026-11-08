import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ stream: vi.fn(), config: vi.fn(), appCheck: {} }));
vi.mock('firebase/ai', () => ({ getAI: vi.fn(), GoogleAIBackend: class {}, ThinkingLevel: { LOW: 'LOW' }, getGenerativeModel: (...args) => { mock.config(...args); return { generateContentStream: mock.stream }; } }));
vi.mock('../src/config/firebase', () => ({ app: {}, get appCheck() { return mock.appCheck; } }));
import { buildCurrentDataSnapshot, createDrumpyyChat, getDrumpyyErrorMessage, sendDrumpyyMessage } from '../src/services/drumpyyAiService';
import { getLocalDrumpyyAnswer } from '../src/services/drumpyyLocalAnswers';
const context = { subjects: [{ name: 'Ethics', instructor: 'Test Instructor', googleClassroomCode: 'PRIVATE', id: 'secret-id' }], sourceStatus: { subjects: 'available' } };
function response(text, reason='STOP') { return { text: () => text, candidates: [{finishReason: reason}] }; }
function success(text='A concise reply.', reason='STOP') {
 mock.stream.mockImplementation(async () => ({ stream: (async function*(){ yield response(text.slice(0,5)); yield response(text.slice(5)); })(), response: Promise.resolve(response(text, reason)) }));
}
beforeEach(() => { mock.stream.mockReset(); mock.appCheck = {}; });
afterEach(() => vi.useRealTimers());
describe('Drumpyy local facts', () => {
 it('knows his animal without cloud setup', async () => { mock.appCheck=null; expect(await sendDrumpyyMessage(createDrumpyyChat(), 'what animal is drumpyy')).toContain("I'm a parrot"); expect(getLocalDrumpyyAnswer('anong hayop ka?')).toContain('loro'); expect(mock.stream).not.toHaveBeenCalled(); });
 it('includes every loaded record and historical information', () => { const snapshot=buildCurrentDataSnapshot({deadlines:Array.from({length:40},(_,i)=>({title:'Task '+i,completed:i===39})), announcements:[{title:'Old notice',expiryDate:'2020-01-01'}]}); expect(snapshot.deadlines.items).toHaveLength(40); expect(snapshot.deadlines.truncated).toBe(false); expect(snapshot.deadlines.items[39].completed).toBe(true); expect(snapshot.announcements.items[0].expired).toBe(true); });
 it('shares visible directory and section fields, excluding hidden data and failed sources', () => { const snapshot=buildCurrentDataSnapshot({students:[{name:'Visible Name',isClassRep:true,studentNumber:'SECRET_NUMBER',email:'SECRET_EMAIL'}],organizations:[{name:'Club',description:'Club details'}],albums:[{title:'Trip',photos:[{},{}]}],classroomContents:[{title:'Lesson',description:'Visible lesson'}],visiblePageText:'Current page facts',sourceStatus:{organizations:'unavailable'}}); const text=JSON.stringify(snapshot); expect(text).toContain('Visible Name'); expect(text).toContain('Visible lesson'); expect(text).toContain('Current page facts'); expect(text).not.toMatch(/SECRET_NUMBER|SECRET_EMAIL|Club details/); expect(snapshot.organizations.status).toBe('unavailable'); expect(snapshot.albums.items[0].photoCount).toBe(2); });
 it('answers the screenshot question without an AI request', async () => { expect(await sendDrumpyyMessage(createDrumpyyChat(), 'who is the teacher in ethics', context)).toBe('Ethics: Test Instructor.'); expect(mock.stream).not.toHaveBeenCalled(); });
 it('uses a listed teacher even without cloud App Check setup', async () => { mock.appCheck = null; expect(await sendDrumpyyMessage(createDrumpyyChat(), 'sino teacher sa Ethics?', context)).toContain('Test Instructor'); });
 it('never uses unavailable or loading records', () => { for (const status of ['loading','unavailable']) expect(getLocalDrumpyyAnswer('teacher in Ethics', {...context,sourceStatus:{subjects:status}})).toBeNull(); });
 it('does not turn unrelated teacher questions into name lookups', () => {expect(getLocalDrumpyyAnswer('how do I contact my Ethics teacher?',context)).toBeNull();});
 it('does not invent an unlisted instructor', () => { expect(getLocalDrumpyyAnswer('teacher in Ethics', {subjects:[{name:'Ethics'}]})).toBe('No instructor is listed for Ethics yet.'); });
 it('asks for clarification for ambiguous subject names', () => { expect(getLocalDrumpyyAnswer('teacher in ethics', {subjects:[{name:'Professional Ethics',instructor:'A'},{name:'Business Ethics',instructor:'B'}]})).toContain('Which subject'); });
 it('adds only public subject fields to the snapshot', () => { const s=JSON.stringify(buildCurrentDataSnapshot(context)); expect(s).toContain('Test Instructor'); expect(s).not.toMatch(/PRIVATE|secret-id/); });
});
describe('Drumpyy streaming and bounded requests', () => {
 it('streams text before the final result, with one request', async () => {
  const updates=[];success(); const chat=createDrumpyyChat();expect(await sendDrumpyyMessage(chat,'Help me',context,{onText:t=>updates.push(t)})).toBe('A concise reply.'); expect(updates[0]).toBe('A con');expect(mock.stream).toHaveBeenCalledTimes(1);expect(chat.history).toHaveLength(2);
  const config=mock.config.mock.calls.at(-1)[1];expect(config.generationConfig.thinkingConfig.thinkingLevel).toBe('LOW');
 });
 it('keeps only three completed exchanges and one current snapshot', async () => {
  success();const chat=createDrumpyyChat();for(let i=0;i<5;i++)await sendDrumpyyMessage(chat,'help '+i,context);
  expect(chat.history).toHaveLength(6); expect(JSON.stringify(chat.history)).not.toContain('CURRENT SYSTEM DATA');
  const contents=mock.stream.mock.calls.at(-1)[0].contents;expect(JSON.stringify(contents).match(/CURRENT SYSTEM DATA SNAPSHOT/g)).toHaveLength(1);
 });
 it('does not automatically issue continuation requests', async () => {success('Partial','MAX_TOKENS');expect(await sendDrumpyyMessage(createDrumpyyChat(),'Help')).toContain('length limit');expect(mock.stream).toHaveBeenCalledTimes(1);});
 it('releases the session on a failed stream and does not save failed turns', async () => {
  const failure=new Error('429 quota');mock.stream.mockImplementation(async()=>({stream:(async function*(){yield response('Partial');throw failure;})(),response:Promise.reject(failure)}));const chat=createDrumpyyChat();await expect(sendDrumpyyMessage(chat,'Help')).rejects.toThrow('quota');expect(chat.busy).toBe(false);expect(chat.history).toHaveLength(0);
 });
 it('handles empty and blocked replies distinctly', async () => {
  success('');await expect(sendDrumpyyMessage(createDrumpyyChat(),'Help')).rejects.toThrow('DRUMPYY_EMPTY_REPLY');success('','SAFETY');await expect(sendDrumpyyMessage(createDrumpyyChat(),'Help')).rejects.toThrow('DRUMPYY_BLOCKED');
 });
 it('stops stalled requests at 30 seconds', async () => {
  vi.useFakeTimers();mock.stream.mockImplementation((_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));
  const chat=createDrumpyyChat();const request=expect(sendDrumpyyMessage(chat,'Help')).rejects.toThrow('DRUMPYY_TIMEOUT');await vi.advanceTimersByTimeAsync(30000);await request;expect(chat.busy).toBe(false);
 });
 it('propagates Stop and prevents overlapping sends', async () => {
  mock.stream.mockImplementation((_,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')))));
  const controller=new AbortController(),chat=createDrumpyyChat();const request=expect(sendDrumpyyMessage(chat,'Help',{}, {signal:controller.signal})).rejects.toMatchObject({name:'AbortError'});await expect(sendDrumpyyMessage(chat,'again')).rejects.toThrow('DRUMPYY_BUSY');controller.abort();await request;expect(chat.history).toHaveLength(0);
 });
 it('fails cloud setup clearly instead of trying a broken request', async () => {mock.appCheck=null;await expect(sendDrumpyyMessage(createDrumpyyChat(),'Help')).rejects.toThrow('DRUMPYY_APPCHECK_NOT_CONFIGURED');expect(mock.stream).not.toHaveBeenCalled();});
 it('gives useful categories for the generic screenshot error', () => {expect(getDrumpyyErrorMessage({message:'403 permission denied'})).toContain('access is blocked');expect(getDrumpyyErrorMessage({message:'429 resource exhausted'})).toContain('request limit');expect(getDrumpyyErrorMessage({message:'AppCheck attestation error'})).toContain('verification failed');});
});
