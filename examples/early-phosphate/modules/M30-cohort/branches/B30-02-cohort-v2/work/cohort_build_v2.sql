-- 队列构建 v2（B30-02 work，模拟 SQL）
-- 数据快照 2025-01-15；相对 v1 的修正见 BUILD-NOTES 注释
WITH icu AS (
  SELECT hadm_id, stay_id, subject_id, intime, outtime,
         ROW_NUMBER() OVER (PARTITION BY subject_id ORDER BY intime) AS stay_seq
  FROM icustays
  WHERE intime >= '2018-01-01' AND intime < '2025-01-01'
),
adults AS (
  SELECT i.* FROM icu i JOIN patients p USING (subject_id)
  WHERE p.anchor_age >= 18
),
first_stay AS (
  SELECT * FROM adults
  WHERE stay_seq = 1 AND EXTRACT(EPOCH FROM (outtime - intime)) / 3600.0 >= 6
),
labs AS (
  SELECT f.stay_id,
         MIN(CASE WHEN l.charttime <= f.intime + INTERVAL '24 hours'
                  THEN l.valuenum END) AS phos_min_24h
  FROM first_stay f
  JOIN labevents l ON l.subject_id = f.subject_id
   AND l.itemid IN (SELECT itemid FROM d_labitems WHERE label = 'Phosphate')
  GROUP BY f.stay_id
),
hypo AS (
  SELECT f.*, l.phos_min_24h
  FROM first_stay f JOIN labs l USING (stay_id)
  WHERE l.phos_min_24h < 0.65
),
repletion AS (
  SELECT h.stay_id,
         MIN(e.starttime) AS phosphate_start,
         MAX(CASE WHEN e.starttime IS NULL THEN 1 ELSE 0 END) AS timing_missing
  FROM hypo h
  LEFT JOIN pharm_orders e
    ON e.stay_id = h.stay_id AND e.drug_class = 'phosphate_iv'
   AND e.starttime <= h.intime + INTERVAL '24 hours'
  GROUP BY h.stay_id
),
ecmo AS (
  SELECT stay_id FROM icustays WHERE ecmo_flag = 1
)
SELECT h.*, r.phosphate_start,
       CASE WHEN r.phosphate_start > h.intime THEN 1 ELSE 0 END AS exposed
FROM hypo h
LEFT JOIN repletion r USING (stay_id)
WHERE h.stay_id NOT IN (SELECT stay_id FROM ecmo)
  AND NOT EXISTS (   -- 排除入 ICU 前 6h 补磷
    SELECT 1 FROM pharm_orders e
    WHERE e.stay_id = h.stay_id AND e.drug_class = 'phosphate_iv'
      AND e.starttime BETWEEN h.intime - INTERVAL '6 hours' AND h.intime)
  AND COALESCE(r.timing_missing, 0) = 0;
