// Run with a local Firestore emulator on 127.0.0.1:8085 loaded with firestore.rules.
// Uses an isolated demo project; no production credentials or network endpoints.
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase/app';
import { initializeFirestore, connectFirestoreEmulator, doc, collection, setDoc, updateDoc, deleteDoc, getDocFromServer, getDocs, onSnapshot, serverTimestamp, terminate, setLogLevel } from 'firebase/firestore';

const projectId = 'demo-blocksync-progress';
const origin = 'http://127.0.0.1:8085';
const apps = [];
const databases = [];
let checks = 0;
setLogLevel('silent');

function client(uid, provider = 'anonymous') {
  const app = initializeApp({ projectId, apiKey: 'emulator-only' }, `progress-${uid || 'public'}-${apps.length}`);
  const db = initializeFirestore(app, {});
  connectFirestoreEmulator(db, '127.0.0.1', 8085, uid ? {
    mockUserToken: { sub: uid, user_id: uid, firebase: { sign_in_provider: provider, identities: {} } },
  } : {});
  apps.push(app);
  databases.push(db);
  return db;
}

async function seed(path, data) {
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key,
    typeof value === 'boolean' ? { booleanValue: value } : { stringValue: value },
  ]));
  const response = await fetch(`${origin}/v1/projects/${projectId}/databases/(default)/documents/${path}`, {
    method: 'PATCH', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }),
  });
  assert.equal(response.status, 200, `Seed ${path}`);
}

const reference = (db, student = 'student-a', activity = 'task') => doc(db, 'studentProgress', student, 'deadlines', activity);
const payload = (uid, status = 'completed', extra = {}) => ({
  source: 'deadlines', sourceId: 'task', status, updatedBy: uid, updatedAt: serverTimestamp(), ...extra,
});
async function denied(label, operation) {
  await assert.rejects(operation(), error => error.code === 'permission-denied', label);
  checks++;
}
function waitForStatus(reference, status) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(new Error('Timed out waiting for remote status ' + status)); }, 10000);
    const stop = onSnapshot(reference, snapshot => {
      if (!snapshot.metadata.hasPendingWrites && snapshot.data()?.status === status) {
        clearTimeout(timer); stop(); resolve();
      }
    }, error => { clearTimeout(timer); reject(error); });
  });
}

try {
  for (const [path, data] of [
    ['students/student-a', { name: 'Test A' }], ['students/student-b', { name: 'Test B' }],
    ['deadlines/task', { title: 'Test task' }], ['deadlines/task-2', { title: 'Second task' }],
    ['classroomContents/work', { contentType: 'coursework' }], ['classroomContents/post', { contentType: 'announcement' }],
    ['schedules/exam', { scheduleKind: 'exam' }], ['schedules/class', { scheduleKind: 'class' }],
    ['users/verified', { role: 'student', active: true, studentId: 'student-a' }],
    ['users/inactive', { role: 'student', active: false, studentId: 'student-a' }],
    ['users/other-role', { role: 'viewer', active: true }],
  ]) await seed(path, data);

  const deviceA = client('device-a');
  const deviceB = client('device-b');
  const publicClient = client(null);
  const verified = client('verified', 'password');
  const inactive = client('inactive', 'password');
  const other = client('other-role', 'password');

  await setDoc(reference(deviceA), payload('device-a'));
  assert.equal((await getDocFromServer(reference(deviceB))).data().status, 'completed'); checks++;
  const remoteUndo = waitForStatus(reference(deviceA), 'not_started');
  await setDoc(reference(deviceB), payload('device-b', 'not_started'));
  await remoteUndo; checks++;
  const remoteComplete = waitForStatus(reference(deviceB), 'completed');
  await setDoc(reference(deviceA), payload('device-a'));
  await remoteComplete; checks++;
  assert.equal((await getDocs(collection(deviceB, 'studentProgress', 'student-a', 'deadlines'))).size, 1); checks++;
  assert.equal((await getDocFromServer(reference(deviceB, 'student-b'))).exists(), false); checks++;
  const reopenedDevice = client('device-new');
  assert.equal((await getDocFromServer(reference(reopenedDevice))).data().status, 'completed'); checks++;

  for (const [id, source, sourceId] of [['classroom-work', 'classroomContents', 'work'], ['exam-schedule-exam', 'schedules', 'exam']]) {
    await setDoc(reference(deviceA, 'student-a', id), payload('device-a', 'completed', { source, sourceId }));
    assert.equal((await getDocFromServer(reference(deviceB, 'student-a', id))).data().status, 'completed'); checks++;
  }
  await setDoc(reference(verified), payload('verified', 'in_progress')); checks++;

  await denied('public read', () => getDocFromServer(reference(publicClient)));
  await denied('public write', () => setDoc(reference(publicClient), payload('public')));
  await denied('inactive student', () => setDoc(reference(inactive), payload('inactive')));
  await denied('nonstudent role', () => setDoc(reference(other), payload('other-role')));
  await denied('unknown roster', () => setDoc(reference(deviceA, 'unknown'), payload('device-a')));
  await denied('unknown roster read', () => getDocs(collection(deviceA, 'studentProgress', 'unknown', 'deadlines')));
  await denied('verified other profile read', () => getDocFromServer(reference(verified, 'student-b')));
  await denied('verified other profile write', () => setDoc(reference(verified, 'student-b'), payload('verified')));
  await denied('forged actor', () => setDoc(reference(deviceA), payload('someone-else')));
  await denied('extra field on update', () => updateDoc(reference(deviceA), { grade: '100' }));
  await denied('invalid create', () => setDoc(reference(deviceA, 'student-a', 'task-2'), payload('device-a', 'admin', { sourceId: 'task-2' })));
  await denied('invalid update', () => setDoc(reference(deviceA), payload('device-a', 'admin')));
  await denied('missing fields on update', () => setDoc(reference(deviceA), { status: 'completed' }));
  await denied('client timestamp', () => setDoc(reference(deviceA), payload('device-a', 'completed', { updatedAt: new Date(2000, 0, 1) })));
  await denied('wrong canonical ID', () => setDoc(reference(deviceA, 'student-a', 'wrong'), payload('device-a')));
  await denied('nonexistent activity', () => setDoc(reference(deviceA, 'student-a', 'missing'), payload('device-a', 'completed', { sourceId: 'missing' })));
  await denied('Classroom announcement', () => setDoc(reference(deviceA, 'student-a', 'classroom-post'), payload('device-a', 'completed', { source: 'classroomContents', sourceId: 'post' })));
  await denied('regular class', () => setDoc(reference(deviceA, 'student-a', 'exam-schedule-class'), payload('device-a', 'completed', { source: 'schedules', sourceId: 'class' })));
  await denied('student deletion', () => deleteDoc(reference(deviceA)));
  await denied('actual submissions remain protected', () => setDoc(doc(deviceA, 'submissions', 'test'), { status: 'completed' }));
  console.log(`Passed ${checks} emulator checks: cross-device completion/undo, roster isolation, supported activities, and rule rejections.`);
} finally {
  await Promise.all(databases.map(db => terminate(db)));
  await Promise.all(apps.map(app => deleteApp(app)));
}
