import { age, hasContact } from './store';

export const visibleProfileWhere = { status: 'active', fee: { in: ['paid', 'waived'] } };

export function canDiscover(profile: { status: string; fee: string } | null | undefined) {
  return profile?.status === 'active' && ['paid', 'waived'].includes(profile.fee);
}

type ReviewableProfile = {
  name: string; email: string; dob: string; gender: string; city: string;
  profession: string; education: string; sect: string; language: string;
  marital: string; manager: string; about: string; values: string;
  prefMin: number; prefMax: number; prefCity: string; oathAt: string;
};

export function profileReviewIssues(profile: ReviewableProfile): string[] {
  const issues: string[] = [];
  for (const key of ['name','email','city','profession','education','sect','language','marital','manager','oathAt'] as const) {
    if (!profile[key]?.trim()) issues.push(`${key} is missing`);
  }
  const birth = new Date(profile.dob + 'T00:00:00Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(profile.dob) || !Number.isFinite(birth.getTime()) || birth.toISOString().slice(0,10) !== profile.dob || age(profile.dob) < 18 || age(profile.dob) > 100) issues.push('A valid adult date of birth is required');
  if (profile.name.trim().length < 2 || profile.name.length > 100) issues.push('A valid full name is required');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) issues.push('A valid account email is required');
  if (!['Woman','Man'].includes(profile.gender)) issues.push('A valid profile gender is required');
  if (!['Shia Ithna Ashariyya','Shia Ismaili','Shia Bohra','Other Shia'].includes(profile.sect)) issues.push('A valid community is required');
  if (!['Self','Parent','Sibling','Guardian'].includes(profile.manager)) issues.push('A valid profile manager is required');
  if (!['Never married','Divorced','Widowed'].includes(profile.marital)) issues.push('A valid marital status is required');
  if (profile.about.trim().length < 30 || profile.about.length > 1000) issues.push('The introduction must contain 30–1000 characters');
  if ([profile.city,profile.profession,profile.education,profile.language,profile.about,profile.prefCity].some(hasContact)) issues.push('Public fields must not contain contact details');
  try {
    const values: unknown = JSON.parse(profile.values);
    const allowed = ['Faith & spirituality','Family-oriented','Education','Kindness','Career','Community','Simple living'];
    if (!Array.isArray(values) || values.length < 1 || values.length > 5 || values.some(value=>!allowed.includes(value))) issues.push('Choose between one and five valid values');
  } catch { issues.push('Profile values are invalid'); }
  if (!Number.isInteger(profile.prefMin) || !Number.isInteger(profile.prefMax) || profile.prefMin < 18 || profile.prefMax > 100 || profile.prefMin > profile.prefMax) issues.push('Match age preferences are invalid');
  return issues;
}
