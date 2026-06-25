-- ============================================================
-- TVS Machine QR — Supabase Schema + Seed Data
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- 1. Tables
create table if not exists machines (
  id               text primary key,
  name             text not null,
  make             text,
  origin           text,
  tonnage          text,
  type             text,
  location         text,
  mfg_year         int,
  shot_weight      text,
  shut_height      text,
  common_dedicated text,
  life_pending     text
);

create table if not exists parts (
  id                bigint generated always as identity primary key,
  machine_id        text not null references machines(id) on delete cascade,
  part_type         text not null check (part_type in ('running', 'alternate')),
  part_number       text not null,
  part_name         text,
  also_runs_on      text,   -- for running parts
  preferred_machine text    -- for alternate parts
);

-- 2. Seed machines
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('FANUC-IMM','Fanuc IMM','Fanuc','Japan','100T','Horizontal','Mould Shop',2013,'103g','240–265mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('BOLERO-LH-TKC','Bolero LH TKC','TKC','Taiwan','55T','Vertical','Bolero',2019,'121.9g','260mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('BOLERO-RH-TKC','Bolero RH TKC','TKC','Taiwan','55T','Vertical','Bolero',2019,'121.9g','260mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MULTIPLAS-55T','Multiplas 55T IMM','Multiplas','Taiwan','55T','Vertical','Mould Shop',2014,'113g','180–280mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MULTIPLAS-85T','Multiplas 85T IMM','Multiplas','Taiwan','85T','Vertical','Mould Shop',2014,'113g','200–300mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MULTIPLAS-200T-NEW','Multiplas 200T New','Multiplas','Taiwan','200T','Vertical','Inteva',2020,'201g','300–400mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MULTIPLAS-200T-OLD','Multiplas 200T Old','Multiplas','Taiwan','200T','Vertical','Inteva',2015,'201g','300–400mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('BI-NEW-TKC','BI New TKC','TKC','Taiwan','40T','Vertical','Brakes India',2021,'99g','260mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('BI-OLD-TKC','BI Old TKC','TKC','Taiwan','55T','Vertical','I6',2010,'122g','260mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MOULD-SHOP-TKC','Mould Shop TKC','TKC','Taiwan','55T','Vertical','Mould Shop',2011,'122g','260mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('JSW-40T','JSW 40T','JSW','Japan','40T','Vertical','Mould Shop',2019,'84g','170–270mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('MPS-120T','MPS 120T','Multiplas','Taiwan','120T','Vertical','Inteva',2018,'163g','200–350mm',null,null)
on conflict (id) do nothing;
insert into machines (id,name,make,origin,tonnage,type,location,mfg_year,shot_weight,shut_height,common_dedicated,life_pending)
values ('JSW-150T','JSW 150T','JSW','Japan','150T','Vertical','Inteva',2015,'182g','300-400mm','Common','8 Yrs')
on conflict (id) do nothing;

-- 3. Seed parts
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','TVS-SE-396','Ball Cup','JSW 40T');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','ZFTVS-SE-279','Bobbin','JSW 40T');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','604-0592I','Button 20C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21112I','D3 Case 16C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21114I','D3 Case 16C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21116I','D3 Case 4C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21117I','D3 Cover 4C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21113I','D3Cover 16C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','609-21115I','D3Cover 16C',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','DC2A420272','ENSA 2.0 PCB Holder',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','604-60013','Mecaplast Button',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('FANUC-IMM','running','E001-X237','Rotable Head','JSW 40T');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('FANUC-IMM','alternate','DC2A420267','ENSA 1.1 Pre-mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-263','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-267','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-268','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-277','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-278','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-283','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-SE-300','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-XJ92','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','ZFTVS-XJ93','Connector','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','TVS-SE-394','Connector-Bottom Read','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','TVS-SE-390','Connector-Side Read','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-LH-TKC','running','TVS-SE-391','Connector-Side Read','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XF91','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XF92','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XH89','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XH91','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XH92','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XJ15','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XJ47','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XJ54','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-LH-TKC','alternate','ZFTVS-XJ55','Housing','Bolero RH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XF91','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XF92','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XH89','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XH91','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XH92','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XJ15','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XJ47','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XJ54','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BOLERO-RH-TKC','running','ZFTVS-XJ55','Housing','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-263','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-267','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-268','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-277','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-278','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-283','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-SE-300','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-XJ92','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','ZFTVS-XJ93','Connector','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','TVS-SE-394','Connector-Bottom Read','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','TVS-SE-390','Connector-Side Read','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BOLERO-RH-TKC','alternate','TVS-SE-391','Connector-Side Read','Bolero LH TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-55T','running','TVSC-XG01','Plug Cap 4C Vacuum Mold',null);
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-55T','running','DC2A420267','ENSA 1.1 Pre-mold','Fanuc IMM, Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-55T','running','DC2A420271','ENSA 2.0 Pre-Mold','JSW 40T, Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-55T','running','DC2A420274','ENSA 4.0 Pre-mold','JSW 40T, Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-55T','alternate','DC2A420270','ENSA 2.0 Clamp Plate','Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-55T','alternate','DC2A420273','ENSA 4.0 Clamp Plate','Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-55T','alternate','DC2A420372','ENSA 4.1 Premold','Multiplas 85T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-85T','running','DC2A420270','ENSA 2.0 Clamp Plate','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-85T','running','DC2A420273','ENSA 4.0 Clamp Plate','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-85T','running','DC2A420372','ENSA 4.1 Premold','Multiplas 55T IMM, Multiplas 200T new, Multiplas 200T Old');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-85T','alternate','DC2A420267','ENSA 1.1 Pre-mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-85T','alternate','DC2A420271','ENSA 2.0 Pre-Mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-85T','alternate','DC2A420274','ENSA 4.0 Pre-mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-200T-NEW','running','DC2A420271','ENSA 2.0 Top Cover','Multiplas 200T Old');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-200T-NEW','running','DC2A420372','ENSA 4.1 Top Cover','Multiplas 200T Old');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-200T-NEW','alternate','DC2A420267','ENSA 1.1 Top Cover','MPS 120T');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-200T-NEW','alternate','DC2A420274','ENSA 4.0 Top Cover','Multiplas 200T Old');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MULTIPLAS-200T-OLD','running','DC2A420274','ENSA 4.0 Top Cover','Multiplas 200T New');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-200T-OLD','alternate','DC2A420271','ENSA 2.0 Top Cover','Multiplas 200T New');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('MULTIPLAS-200T-OLD','alternate','DC2A420372','ENSA 4.1 Top Cover','Multiplas 200T New');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BI-NEW-TKC','running','TVS-SE-459','END CAP I6 Close Coil','JSW 40T');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BI-NEW-TKC','running','TVS-SE-460','END CAP I6 Open Coil','JSW 40T');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('BI-OLD-TKC','running','E001-X332','E-BIKE Housing',null);
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BI-OLD-TKC','alternate','TVS-SE-450','ESO 12V','Mould Shop TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BI-OLD-TKC','alternate','TVS-SE-457','ETSO 12V','Mould Shop TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('BI-OLD-TKC','alternate','TVS-SE-456','ETSO 6V','Mould Shop TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MOULD-SHOP-TKC','running','TVS-SE-450','ESO 12V','BI Old TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MOULD-SHOP-TKC','running','TVS-SE-457','ETSO 12V','BI Old TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MOULD-SHOP-TKC','running','TVS-SE-456','ETSO 6V','BI Old TKC');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MOULD-SHOP-TKC','running','TVS-SE-183','CAS',null);
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','TVS-SE-396','Ball Cup','Fanuc IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','ZFTVS-SE-279','Bobbin','Fanuc IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','ZFTVS-SE-301','IC Carrier 4C','Baby Plas (External)');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','E001-X320','Magnet Holder','Baby Plas (External)');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','E001-X237','Rotable Head','Fanuc IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','DC2A420271','ENSA 2.0 Pre-Mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','DC2A420274','ENSA 4.0 Pre-mold','Multiplas 55T IMM');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','TVS-SE-459','END CAP I6 Close Coil','BI New TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','TVS-SE-460','END CAP I6 Open Coil','BI New TKC');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','TVS-SE-389','Terminal Holder Side & Bottom','Nigatta 30T (External)');
insert into parts (machine_id,part_type,part_number,part_name,preferred_machine) values ('JSW-40T','alternate','TVS-SE-395','Terminal Holder Side & Bottom','Nigatta 30T (External)');
insert into parts (machine_id,part_type,part_number,part_name,also_runs_on) values ('MPS-120T','running','DC2A420267','ENSA 1.1 Top Cover','Multiplas 200T New');

-- 4. Storage bucket (run ONCE)
-- insert into storage.buckets (id, name, public) values ('excel-uploads', 'excel-uploads', false) on conflict do nothing;

-- 5. Storage policy: allow service_role full access (default)
-- No extra RLS policy needed when using service_role key from Node.js
