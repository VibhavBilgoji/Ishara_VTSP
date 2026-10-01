-- Ishara: Seed Data for Demo
-- Migration 003: Demo hospital, ISL clips library
-- Demo user accounts are created with scripts/seed-production-simulation.ts after applying migrations.

-- Demo hospital
insert into public.hospitals (id, name) values
  ('a0000000-0000-0000-0000-000000000001', 'Ishara Demo Hospital');

-- ISL Clips Library (full phrase list)
-- Storage paths assume files are uploaded to 'isl-clips' bucket with key as filename

-- Emergency (P0)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('chest-pain', 'Chest pain', '{"my chest hurts","heart pain","chest ache"}', 'Emergency', 'P0', 'chest-pain.mp4', 20),
  ('cant-breathe', 'Can''t breathe', '{"breathing problem","shortness of breath","difficulty breathing","hard to breathe"}', 'Emergency', 'P0', 'cant-breathe.mp4', 15),
  ('im-dizzy', 'I''m dizzy', '{"feeling dizzy","dizziness","lightheaded","vertigo"}', 'Emergency', 'P0', 'im-dizzy.mp4', 15),
  ('feel-very-sick', 'I feel very sick', '{"feeling sick","very unwell","nauseous","ill"}', 'Emergency', 'P0', 'feel-very-sick.mp4', 15),
  ('call-doctor-now', 'Call doctor now', '{"need doctor","get doctor","doctor urgent","doctor immediately"}', 'Emergency', 'P0', 'call-doctor-now.mp4', 15),
  ('emergency', 'Emergency', '{"urgent","help","critical","emergency help"}', 'Emergency', 'P0', 'emergency.mp4', 10),
  ('help-me', 'Help me', '{"help","need help","please help","assist me"}', 'Emergency', 'P0', 'help-me.mp4', 10);

-- Pain (P0)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('pain-level', 'Pain level 1-10', '{"rate pain","pain scale","how much pain","pain number"}', 'Pain', 'P0', 'pain-level.mp4', 20),
  ('head-hurts', 'My head hurts', '{"headache","head pain","migraine"}', 'Pain', 'P0', 'head-hurts.mp4', 15),
  ('stomach-hurts', 'My stomach hurts', '{"stomach pain","belly ache","abdominal pain","tummy hurts"}', 'Pain', 'P0', 'stomach-hurts.mp4', 15),
  ('chest-hurts', 'My chest hurts', '{"chest pain","pain in chest"}', 'Pain', 'P0', 'chest-hurts.mp4', 15),
  ('back-hurts', 'My back hurts', '{"back pain","backache","lower back pain","spine pain"}', 'Pain', 'P0', 'back-hurts.mp4', 15),
  ('pain-started-now', 'Pain started now', '{"sudden pain","pain just started","new pain","just began"}', 'Pain', 'P0', 'pain-started-now.mp4', 15);

-- Allergies (P0)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('i-have-allergy', 'I have allergy', '{"allergic","allergy","allergic reaction"}', 'Allergies', 'P0', 'i-have-allergy.mp4', 15),
  ('allergic-penicillin', 'Allergic to penicillin', '{"penicillin allergy","cannot take penicillin"}', 'Allergies', 'P0', 'allergic-penicillin.mp4', 15),
  ('allergic-aspirin', 'Allergic to aspirin', '{"aspirin allergy","cannot take aspirin"}', 'Allergies', 'P0', 'allergic-aspirin.mp4', 15),
  ('allergic-latex', 'Allergic to latex', '{"latex allergy","cannot use latex"}', 'Allergies', 'P0', 'allergic-latex.mp4', 15),
  ('no-known-allergy', 'No known allergy', '{"no allergies","not allergic","allergy free"}', 'Allergies', 'P0', 'no-known-allergy.mp4', 15);

-- Basic needs (P1)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('water', 'Water', '{"thirsty","need water","drink","glass of water"}', 'Basic needs', 'P1', 'water.mp4', 10),
  ('toilet', 'Toilet', '{"bathroom","restroom","need toilet","washroom"}', 'Basic needs', 'P1', 'toilet.mp4', 10),
  ('cold', 'Cold', '{"feeling cold","chilly","freezing","shivering"}', 'Basic needs', 'P1', 'cold.mp4', 10),
  ('hot', 'Hot', '{"feeling hot","warm","overheated","sweating"}', 'Basic needs', 'P1', 'hot.mp4', 10),
  ('blanket', 'Blanket', '{"need blanket","cover","sheet","warm cover"}', 'Basic needs', 'P1', 'blanket.mp4', 10),
  ('hungry', 'Hungry', '{"need food","want to eat","starving","food"}', 'Basic needs', 'P1', 'hungry.mp4', 10),
  ('nausea', 'Nausea', '{"feeling nauseous","sick to stomach","queasy"}', 'Basic needs', 'P1', 'nausea.mp4', 10),
  ('vomit', 'Vomit', '{"throwing up","vomiting","being sick","puke"}', 'Basic needs', 'P1', 'vomit.mp4', 10);

-- Medical history (P1)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('diabetic', 'Diabetic', '{"diabetes","sugar problem","blood sugar","insulin"}', 'Medical history', 'P1', 'diabetic.mp4', 15),
  ('heart-condition', 'Heart condition', '{"heart problem","cardiac","heart disease"}', 'Medical history', 'P1', 'heart-condition.mp4', 15),
  ('high-blood-pressure', 'High blood pressure', '{"hypertension","BP high","blood pressure problem"}', 'Medical history', 'P1', 'high-blood-pressure.mp4', 15),
  ('pregnant', 'Pregnant', '{"pregnancy","expecting","with child"}', 'Medical history', 'P1', 'pregnant.mp4', 15),
  ('surgery-before', 'Surgery before', '{"previous surgery","had operation","past surgery"}', 'Medical history', 'P1', 'surgery-before.mp4', 15),
  ('blood-type', 'Blood type', '{"blood group","what blood type","A B O"}', 'Medical history', 'P1', 'blood-type.mp4', 15);

-- Doctor to patient (P1)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('you-are-safe', 'You are safe', '{"safe","don''t worry","you''re okay","everything is fine"}', 'Doctor to patient', 'P1', 'you-are-safe.mp4', 15),
  ('we-are-helping', 'We are helping you', '{"helping","taking care","treating you","assisting"}', 'Doctor to patient', 'P1', 'we-are-helping.mp4', 15),
  ('do-you-understand', 'Do you understand?', '{"understand","clear","got it","comprehend"}', 'Doctor to patient', 'P1', 'do-you-understand.mp4', 15),
  ('take-medicine', 'Take this medicine', '{"medicine","tablet","pill","medication","take this"}', 'Doctor to patient', 'P1', 'take-medicine.mp4', 15),
  ('stay-still', 'Stay still', '{"don''t move","remain still","hold still","be still"}', 'Doctor to patient', 'P1', 'stay-still.mp4', 10),
  ('relax', 'Relax', '{"calm down","take it easy","breathe","stay calm"}', 'Doctor to patient', 'P1', 'relax.mp4', 10),
  ('good', 'Good', '{"well done","that''s good","great","okay good"}', 'Doctor to patient', 'P1', 'good.mp4', 10);

-- Consent (P2)
insert into public.isl_clips (key, label, aliases, category, priority, storage_path, duration_seconds) values
  ('do-you-agree', 'Do you agree?', '{"agree","consent","approval","permission","is that okay"}', 'Consent', 'P2', 'do-you-agree.mp4', 15),
  ('sign-here', 'Sign here', '{"signature","sign this","put your sign","autograph"}', 'Consent', 'P2', 'sign-here.mp4', 15),
  ('need-to-do-test', 'We need to do a test', '{"test","examination","check","diagnostic","lab test"}', 'Consent', 'P2', 'need-to-do-test.mp4', 15),
  ('this-will-help', 'This will help you', '{"this helps","beneficial","for your benefit","treatment"}', 'Consent', 'P2', 'this-will-help.mp4', 15),
  ('family-here', 'Do you have family here?', '{"family","relative","someone with you","companion","guardian"}', 'Consent', 'P2', 'family-here.mp4', 15);
