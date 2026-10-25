import { randomUUID } from 'node:crypto';
import { prisma } from './prisma';
import { hashPassword } from './auth';
import { demoAccounts } from './demo-accounts';

// Invoked only by an authenticated administrator in a development server.
export async function seedDemoProfiles() {
  if (process.env.NODE_ENV !== 'development') throw new Error('Demo data is available only in development.');
  const samples = [
    { id:'DEMO-MEMBER', email:demoAccounts.member.email, name:'Demo Member', gender:'Man', dob:'1997-04-12', city:'Mumbai', profession:'Product designer', education:'Master’s degree', manager:'Self' },
    { id:'DEMO-1001', email:'sample-1@example.test', name:'Demo Amina', gender:'Woman', dob:'1999-08-15', city:'Mumbai', profession:'Architect', education:'Bachelor of Architecture', manager:'Self' },
    { id:'DEMO-1002', email:'sample-2@example.test', name:'Demo Zainab', gender:'Woman', dob:'1998-03-20', city:'Hyderabad', profession:'Doctor', education:'MBBS', manager:'Parent' },
    { id:'DEMO-1003', email:'sample-3@example.test', name:'Demo Fatima', gender:'Woman', dob:'2000-06-10', city:'Lucknow', profession:'Teacher', education:'Master’s degree', manager:'Sibling' },
    { id:'DEMO-1004', email:'sample-4@example.test', name:'Demo Hasan', gender:'Man', dob:'1995-01-25', city:'Pune', profession:'Software engineer', education:'B.Tech', manager:'Self' },
    { id:'DEMO-1005', email:'sample-5@example.test', name:'Demo Ali', gender:'Man', dob:'1996-11-05', city:'Delhi', profession:'Research analyst', education:'Ph.D.', manager:'Parent' },
    { id:'DEMO-1006', email:'sample-6@example.test', name:'Demo Hussain', gender:'Man', dob:'1998-02-18', city:'Bengaluru', profession:'Business analyst', education:'MBA', manager:'Self' },
    { id:'DEMO-REVIEW-1001', email:'sample-review-1@example.test', name:'Demo Sara', gender:'Woman', dob:'1999-05-16', city:'Mumbai', profession:'Interior designer', education:'Design degree', manager:'Self' },
    { id:'DEMO-REVIEW-1002', email:'sample-review-2@example.test', name:'Demo Abbas', gender:'Man', dob:'1996-09-21', city:'Lucknow', profession:'Civil engineer', education:'B.Tech', manager:'Parent' },
    { id:'DEMO-REVIEW-1003', email:'sample-review-3@example.test', name:'Demo Maryam', gender:'Woman', dob:'1998-12-07', city:'Hyderabad', profession:'Lecturer', education:'Master’s degree', manager:'Self' },
  ];
  await prisma.$transaction(async tx => {
    for (const sample of samples) {
      const password = sample.email === demoAccounts.member.email ? demoAccounts.member.password : randomUUID();
      const { hash } = hashPassword(password);
      const user = await tx.user.upsert({ where: { email: sample.email }, update: {}, create: { email:sample.email, password:hash } });
      // Never overwrite existing profiles, approval decisions, or user edits.
      await tx.profile.upsert({ where: { userId:user.id }, update: {}, create: {
        ...sample, userId:user.id, sect:'Shia Ithna Ashariyya', language:'Urdu, English', marital:'Never married',
        about:'Fictional demonstration profile for testing Sukoon. Values family, kindness, shared faith, and thoughtful communication in a future marriage.',
        values:JSON.stringify(['Faith & spirituality','Family-oriented','Kindness']), prefMin:23, prefMax:36, prefCity:'',
        status:sample.id.startsWith('DEMO-REVIEW-')?'pending':'active', fee:sample.id==='DEMO-REVIEW-1003'?'unpaid':'waived', oathAt:new Date().toISOString(),
      } });
    }
  }, { timeout:20000 });
  return samples.length;
}
