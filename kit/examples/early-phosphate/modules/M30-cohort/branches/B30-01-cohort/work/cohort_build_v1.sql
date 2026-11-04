-- 队列构建 v1（B30-01 work，模拟 SQL）
-- 数据快照 2024-07-01
WITH icu AS (
  SELECT hadm_id, stay_id, subject_id, intime, outtime,
         ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY intime) AS stay_seq
  FROM icustays
  WHERE intime >= '2018-01-01' AND intime < '2024-07-01'
),
adults AS (
  SELECT i.*
  FROM icu i JOIN patients p USING (subject_id)
  WHERE p.anchor_age >= 18
),
first_stay AS (
  SELECT * FROM adults
  WHERE stay_seq = 1 AND EXTRACT(EPOCH FROM (outtime - intime)) / 3600.0 >= 6
),
labs AS (
  SELECT f.stay_id,
         MIN(CASE WHEN l.charttime <= f.intime + INTERVAL '24 hours'
                  THEN l.valuenum END) AS phos_min_24h,
         MIN(l.charttime) AS first_phos_time
  FROM first_stay f
  JOIN labevents l ON l.subject_id = f.subject_id
   AND l.itemid IN (SELECT itemid FROM d_labitems WHERE label = 'Phosphate')
  GROUP BY f.stay_id
),
hypo AS (
  SELECT f.*, l.phos_min_24h, l.first_phos_time
  FROM first_stay f JOIN labs l USING (stay_id)
  WHERE l.phos_min_24h < 0.65
)
SELECT * FROM hypo;
-- v1 的已知缺陷：本版实际使用「首次检测」而非 phos_min_24h，且未排除入 ICU 前补磷
