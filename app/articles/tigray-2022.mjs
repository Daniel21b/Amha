import {editors} from '../publication.mjs';
const source=(id,title,url,publisher,date)=>({id,title,url,publisher,date});
const heading=text=>({type:'heading',text,sourceIds:[]});
const opinion=text=>({type:'opinion',text,sourceIds:[]});
const claim=(text,...sourceIds)=>({type:'claim',text,sourceIds});
const dedebit=source('dedebit','Ethiopia: Airstrike on Camp for Displaced Likely War Crime','https://www.hrw.org/news/2022/03/24/ethiopia-airstrike-camp-displaced-likely-war-crime','Human Rights Watch','2022-03-24');
const hunger=source('food-assessment','Tigray Emergency Food Security Assessment','https://www.wfp.org/publications/tigray-emergency-food-security-assessment','World Food Programme','2022-03-21');
const relief=source('wfp-june','Conflict, climate and soaring food prices push Ethiopia further into hunger','https://www.wfp.org/news/conflict-climate-and-soaring-food-prices-push-ethiopia-further-hunger-while-wfp-funding-runs','World Food Programme','2022-06-23');
const commission=source('un-commission','Human Rights Council: Ethiopia commission findings and government response','https://www.ungeneva.org/en/news-media/meeting-summary/2022/09/le-conseil-est-informe-quil-y-des-motifs-raisonnables-de-croire','United Nations Geneva','2022-09-22');
const pretoria=source('pretoria','Cessation of Hostilities Agreement: announcement from Pretoria','https://www.aupaps.org/en/article/cessation-of-hostilities-agreement-between-the-government-of-the-federal-democratic-republic-of-ethiopia-and-the-tigray-peoples-liberation-front-tplf','African Union','2022-11-02');
const base={category:'opinion-analysis',region:'Tigray',type:'Retrospective opinion',byline:editors.names,authors:['daniel-asfaw','yohannes-asfaw'],language:'en',translationStatus:'original',date:'2026-09-28',readMinutes:3};
export const tigray2022Articles=[
 {
  ...base,slug:'tigray-2022-dedebit-abiy-accountability',
  title:'Dedebit, 2022: Abiy cannot ask us to look away',
  deck:'An airstrike on displaced families demands more than a political explanation. Our retrospective on Dedebit asks why civilian protection must come before a leader’s claim to victory.',
  dateline:'2022 RETROSPECTIVE · DEDEBIT',retrospectivePeriod:'January–March 2022',sources:[dedebit],sourceIds:['dedebit'],
  pullquote:'A government cannot measure its strength by the weapons it commands and ask us to ignore the people beneath them.',
  blocks:[
   opinion('We are angry at the expectation that Ethiopians should turn every civilian tragedy into a debate about which leader deserves their loyalty. We refuse that bargain. Abiy Ahmed’s leadership during the Tigray war deserves fierce scrutiny because protecting people is the responsibility of government. It cannot be postponed until after a victory speech. Dedebit belongs at the centre of that scrutiny.'),
   heading('The people who had already fled'),
   claim('Human Rights Watch reported that a January 7, 2022 Ethiopian government airstrike hit a school compound sheltering displaced people in Dedebit. Its investigation recorded at least 57 deaths and more than 42 injuries. Drawing on interviews and verified visual material, HRW said it found no evidence of a military target at the site and assessed the attack as a likely war crime. That is the organization’s finding, not a court judgment.','dedebit'),
   opinion('Consider what that means before reaching for a slogan. A place of refuge should offer a family some chance of surviving what it has already escaped. Our anger is directed at a politics that asks the public to accept devastation as background noise while the reputation of the leadership occupies the foreground. No prime minister’s image deserves more protection than a displaced child.'),
   heading('Political responsibility is not optional'),
   opinion('This record does not establish that Abiy personally selected the target or ordered this particular strike. We will not invent that evidence. But the absence of such proof does not cancel political responsibility. The head of government should have to explain how military operations protect civilians, who investigates when protection fails, and how survivors can obtain answers without being dismissed as supporters of an enemy.'),
   opinion('Our demand is for an independent investigation able to examine targeting decisions, operational records and the chain of command. Officials should preserve evidence and answer specific questions. Where evidence establishes individual wrongdoing, accountability should follow through a fair process. National pride cannot serve as a substitute for that work. A state worthy of its citizens should welcome the distinction between defending the country and shielding misconduct.'),
   heading('No party owns the victims'),
   opinion('Criticizing Abiy does not require us to defend the TPLF. Nor does criticizing the TPLF require silence about government forces. That forced choice insults the dead and traps the living inside factional arguments. A civilian’s right to survive does not depend on which language they speak, which region they come from, or whether their family has ever supported an opposition party.'),
   opinion('For readers exhausted by this regime, anger can be a refusal to accept the same evasions again. It should sharpen our demands: open the record, protect witnesses, investigate impartially, support survivors and allow public criticism. It should never become a licence to blame an entire ethnic community or to celebrate another family’s suffering.'),
   heading('Remembering must change what we demand'),
   opinion('We return to 2022 because remembrance without accountability is too easily absorbed into another ceremony. Dedebit should make it impossible to discuss military success without asking who paid for it. Abiy owes the public more than assurances about intentions. We want verifiable answers about conduct and consequences. A government cannot measure its strength by the weapons it commands and ask us to ignore the people beneath them.')
  ]
 },
 {
  ...base,slug:'tigray-2022-hunger-not-a-bargaining-chip',
  title:'Tigray, 2022: hunger was never an acceptable price of power',
  deck:'The food-security record and allegations of deliberate deprivation demand a reckoning with Abiy’s wartime leadership. Civilians’ access to food must never depend on political submission.',
  dateline:'2022 RETROSPECTIVE · HUNGER & HUMANITARIAN ACCESS',retrospectivePeriod:'March–September 2022',sources:[hunger,commission,relief],sourceIds:['food-assessment','un-commission'],
  pullquote:'A hungry child does not owe a government a political concession.',
  blocks:[
   opinion('There is something intolerable about a political argument that becomes sophisticated only when it is explaining why ordinary people must wait for food. Our view of Abiy Ahmed’s wartime leadership is severe: a government that demands legitimacy must be judged by whether people can live under its decisions. Hunger cannot be reduced to a public-relations problem, and humanitarian access cannot be treated as a favour.'),
   heading('The warning was already in the record'),
   claim('A World Food Programme assessment published in March 2022 classified 83 percent of the population surveyed in Tigray as food insecure, including 37 percent as severely food insecure. These figures describe the assessment’s surveyed population in Tigray; they are not national estimates for every Ethiopian household.','food-assessment'),
   opinion('Statistics can numb a reader when they should interrupt everything. Behind a percentage is the question of whether a parent can feed a child today. We believe a government confronted with suffering on that scale should be judged by the urgency of its response, its willingness to remove obstacles, and its openness to scrutiny. No leader should be permitted to turn those tests into a referendum on patriotism.'),
   heading('An allegation that demanded an answer'),
   claim('In September 2022, the UN’s International Commission of Human Rights Experts on Ethiopia reported reasonable grounds to believe the federal government was using starvation as a method of warfare. Ethiopia rejected the commission’s report as biased and its allegations as unsubstantiated, saying it was implementing recommendations from an earlier joint investigation. These are attributed findings and a government response, not a criminal conviction.','un-commission'),
   opinion('The gravity of that allegation calls for independent examination of decisions, restrictions and their consequences. A denial is part of the record; it does not settle the matter. We want scrutiny that can reach officials and commanders, protect witnesses and make its reasoning public. Abiy’s government should be challenged on evidence. It should also be prevented from treating the demand for evidence as an act of disloyalty.'),
   heading('Accuracy makes the criticism stronger'),
   claim('WFP’s June 2022 update identified conflict, drought and rising food prices as overlapping drivers of hunger across Ethiopia, alongside a funding crisis for its response. It also reported food assistance reaching more than 800,000 people in Tigray and emergency rations delivered to 1.3 million people in Afar and Amhara. It would therefore be inaccurate to say no aid reached people, or that every instance of hunger nationwide had one cause.','wfp-june'),
   opinion('Those distinctions do not soften our anger. They direct it. Relief workers and communities deserve recognition for assistance that reached families. Their work cannot automatically vindicate every government decision. The useful questions are concrete: what prevented additional assistance, who controlled those obstacles, and what could have been changed sooner? Answers should be tested against records and testimony, not against the speaker’s political affiliation.'),
   heading('Survival must come before leverage'),
   opinion('Our demand is unconditional civilian access to food, medicine and essential services, accompanied by independent monitoring. Armed actors should not obstruct relief, divert it or use civilians’ needs to strengthen their negotiating position. That standard applies to the government and to its opponents. It is precisely because the standard is universal that we reject attempts to exempt those holding state power.'),
   opinion('A hungry child does not owe a government a political concession. Remembering 2022 means refusing to let arguments about sovereignty, strategy or a leader’s prestige make that truth disappear. We want an Ethiopia where the public can demand answers about deprivation without having to prove allegiance first. Abiy’s wartime record must be measured against that basic obligation, however uncomfortable the result is for his supporters.')
  ]
 },
 {
  ...base,slug:'pretoria-2022-peace-does-not-erase-accountability',
  title:'Pretoria, 2022: peace did not give Abiy a clean slate',
  deck:'The cessation of hostilities was necessary. Treating it as the end of questions about the war would betray the people who endured it.',
  dateline:'2022 RETROSPECTIVE · THE PRETORIA AGREEMENT',retrospectivePeriod:'September–November 2022',sources:[pretoria,commission],sourceIds:['pretoria'],
  pullquote:'Stopping a war is an obligation. It is not a receipt cancelling everything that came before.',
  blocks:[
   opinion('We welcome any genuine step that stops families from being killed. We also reject the expectation that relief must be expressed as gratitude to the men who exercised power during the catastrophe. Abiy Ahmed did not earn exemption from scrutiny when negotiations produced a way out. Neither did the TPLF leadership. Stopping a war is an obligation. It is not a receipt cancelling everything that came before.'),
   heading('What Pretoria represented'),
   claim('On November 2, 2022, the African Union announced the conclusion of talks between Ethiopia’s federal government and the TPLF in Pretoria. Its announcement described a cessation of hostilities and a path toward unhindered humanitarian access, restoration of services, healing and reconciliation. This was a negotiated agreement between the parties; describing it simply as a surrender obscures that record.','pretoria'),
   opinion('Those aims deserve support because civilians deserve to live. But our measure of peace is what happens beyond the signing table: whether a family can obtain care, whether a child can return to school, and whether displaced people can rebuild their lives safely. A ceremony cannot answer those questions by itself. The authorities should have to demonstrate progress to the people affected, with evidence that others can inspect.'),
   heading('The allegations did not disappear'),
   claim('Weeks before Pretoria, the UN commission on Ethiopia reported reasonable grounds to believe the federal government and its allies had committed crimes against humanity in Tigray. It also reported serious abuses by Tigrayan forces, including acts it assessed as war crimes. The government disputed the commission’s findings. The commission called for independent, impartial accountability.','un-commission'),
   opinion('Our position is that peace and accountability belong together. Investigating abuses should not mean collective punishment, predetermined convictions or revenge. It should mean establishing what happened, examining the evidence against individuals, protecting those who testify and providing a fair opportunity to respond. A settlement that ends fighting should make that work more possible. It should not make survivors’ questions less legitimate.'),
   heading('Do not mistake exhaustion for consent'),
   opinion('People can desperately want the guns to stop and still be furious with their leaders. Those feelings are not contradictory. We refuse to interpret a population’s need for relief as approval of every decision that brought it to the negotiating table. Nor should anyone demand that a bereaved family choose between supporting peace and asking why a loved one died.'),
   opinion('For Abiy, meaningful accountability would require accepting independent scrutiny of his administration’s wartime decisions and allowing Ethiopians to challenge his leadership peacefully. For TPLF leaders, it would require the same willingness to examine their own conduct. Political survival cannot be the overriding purpose of reconciliation. Otherwise, the people who suffered become spectators while those who exercised power decide which questions may be asked.'),
   heading('The country belongs to its people'),
   opinion('We want public records, credible investigations, support for survivors and institutions strong enough to restrain whoever governs next. We want disagreements resolved through peaceful political participation rather than another armed contest that demands sacrifice from families with the least protection. Those are standards for a different political future, not a call to trade one unaccountable leadership for another.'),
   opinion('Our anger at Abiy’s handling of the war is rooted in that demand. Ethiopia deserves more than a cycle in which leaders ask for trust, civilians bear the cost, and an agreement is then presented as the final word. Pretoria should be remembered as a necessary opening. What the public does with that opening must include the freedom to say: peace matters, and we still demand answers.')
  ]
 }
];
