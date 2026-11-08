import { BRANDING } from "../store/brandingStore";

const clean = value => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);
const normalize = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const statusFor = (context, source) => context.sourceStatus?.[source] || "available";

// Narrow factual lookup: use only the same authorized records already in the UI.
export function getLocalDrumpyyAnswer(question, context = {}) {
  if (/\b(drumpyy|you|your|ikaw|ka|mo|siya)\b/i.test(question) && /\b(animal|species|bird|parrot|hayop|ibon)\b/i.test(question)) {
    return /\b(ano|anong|hayop|ibon|ikaw)\b/i.test(question)
      ? `Isa akong parrot (loro)! Ako si Drumpyy, ang purple na mascot at gabay ng ${BRANDING.name} para sa ${BRANDING.section}.`
      : `I'm a parrot! I'm Drumpyy, the purple mascot with a graduation cap and backpack, and your friendly ${BRANDING.name} guide for ${BRANDING.section}.`;
  }
  if (/^(who are you|who is drumpyy|what is your name|sino ka|sino si drumpyy)[?.!\s]*$/i.test(question.trim())) return `I'm Drumpyy, a purple parrot and your friendly ${BRANDING.name} guide for ${BRANDING.section}.`;
  if (!/\b(teacher|instructor|professor|prof|guro|nagtuturo)\b/i.test(question)) return null;
  if (!/\b(who|sino|name|pangalan)\b/i.test(question) && !/^\s*(teacher|instructor|professor|prof|guro)\b/i.test(question)) return null;
  const query = ` ${normalize(question)} `;
  const records = [
    ...(statusFor(context, "subjects") === "available" ? context.subjects || [] : []).map(s => ({ name: clean(s.name), instructor: clean(s.instructor) })),
    ...(statusFor(context, "schedules") === "available" ? context.schedules || [] : []).map(s => ({ name: clean(s.subjectName), instructor: clean(s.instructor) })),
  ].filter(s => s.name);
  const exact = records.filter(s => query.includes(` ${normalize(s.name)} `));
  const ignored = new Set(["the", "of", "and", "in", "to", "for", "sa", "ng"]);
  const matches = exact.length ? exact : records.filter(s => normalize(s.name).split(" ").some(word => word.length > 3 && !ignored.has(word) && query.includes(` ${word} `)));
  if (!matches.length) return null;
  const named = [...new Set(matches.map(s => s.name))];
  if (named.length > 1 && !exact.length) return `Which subject do you mean: ${named.slice(0, 4).join(", ")}?`;
  const answers = named.map(name => {
    const teachers = [...new Set(matches.filter(s => s.name === name).map(s => s.instructor).filter(Boolean))];
    return teachers.length ? `${name}: ${teachers.join(" / ")}.` : `No instructor is listed for ${name} yet.`;
  });
  return answers.slice(0, 6).join("\n\n");
}
