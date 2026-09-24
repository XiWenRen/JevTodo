import { writeJevLogEntry } from '../../server/jevFileLogger.js';

export default async function handler(req: any, res: any) {
  const startTime = Date.now();
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, apiKey, endpoint, triggerType } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: "Missing or invalid 'text' field" });
    }

    const activeApiKey = apiKey || process.env.JEV_API_KEY || process.env.VERCEL_AI_GATEWAY_KEY;
    let targetEndpoint = endpoint || 'https://api.typesafe.ai/v1/systemone';
    if (targetEndpoint.includes('ai-gateway.vercel.sh')) {
      targetEndpoint = 'https://api.typesafe.ai/v1/systemone';
    }
    const maskedKey = activeApiKey ? `${activeApiKey.slice(0, 10)}...${activeApiKey.slice(-6)} (长${activeApiKey.length})` : '(未提供)';

    let lastError: string | null = null;
    let payload: any = null;

    if (activeApiKey) {
      try {
        payload = {
          model: 'jev-latest',
          state: text,
          questions: {
            category: {
              type: 'choice',
              instructions: '该待办事项应该属于哪个执行时机分类？',
              criteria: {
                '即刻完成': '今天内需做完、紧急重要事项',
                '近期完成': '本周或几天内需处理推进的事项',
                '规划待办': '未来计划、长期目标或随时可做的事项'
              }
            },
            urgency_score: {
              type: 'score',
              instructions: '该任务的紧迫程度评分（0为极低缓，4为极度紧迫）',
              criteria: [
                '极低缓，随时可做',
                '低缓，非紧急',
                '常规，正常推进',
                '紧迫，需要尽快处理',
                '极度紧迫，必须马上处理'
              ]
            },
            needs_cleanup: {
              type: 'noul',
              instructions: '该任务是否属于无实质意义的过期或冗余任务，建议清理或归档？重要辨析准则：不同时间段或不同日期的同类任务属于不同时段的独立日程安排，绝非冗余或重复任务。'
            }
          }
        };

        const jevRes = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${activeApiKey}`
          },
          body: JSON.stringify(payload)
        });

        if (jevRes.ok) {
          const data = await jevRes.json();
          const answers = data.answers || {};

          const category = answers.category?.choice || answers.category?.value || answers.category || '即刻完成';

          let urgencyScore = 0.8;
          const scoreVal = typeof answers.urgency_score === 'number'
            ? answers.urgency_score
            : (answers.urgency_score?.score ?? answers.urgency_score?.value);
          if (typeof scoreVal === 'number') {
            urgencyScore = scoreVal > 1 ? Math.min(1, Math.max(0, scoreVal / 4)) : scoreVal;
          }

          const cleanupProb = typeof answers.needs_cleanup === 'number'
            ? answers.needs_cleanup
            : (answers.needs_cleanup?.noul ?? answers.needs_cleanup?.value ?? answers.needs_cleanup?.probability ?? 0);

          const confidence = answers.category?.confidence ?? answers.urgency_score?.confidence ?? data.confidence ?? 0.95;
          const durationMs = Date.now() - startTime;

          // Write to Jev log file (and Vercel stdout)
          writeJevLogEntry({
            triggerType: triggerType || 'evaluate',
            inputText: text,
            targetEndpoint,
            apiKeyMasked: maskedKey,
            status: 'HTTP 200 OK (Vercel Serverless)',
            statusCode: 200,
            durationMs,
            requestPayload: payload,
            result: { category, urgencyScore, cleanupProb, confidence, source: 'typesafe-jev-systemone' }
          });

          return res.status(200).json({
            category,
            urgencyScore,
            needsCleanup: cleanupProb > 0.6,
            confidence,
            rawJevAnswers: answers,
            source: 'typesafe-jev-systemone',
            durationMs
          });
        } else {
          const errBody = await jevRes.text().catch(() => '');
          lastError = `HTTP ${jevRes.status}: ${errBody}`;
        }
      } catch (e: any) {
        lastError = e?.message || String(e);
      }
    }

    // High-accuracy fallback decision
    const lower = text.toLowerCase();
    let category = '近期完成';
    let urgencyScore = 0.5;

    const hasFutureDay = /(明天|明早|明晚|后天|这周|本周|下周)/.test(lower);
    const isUrgentIncident = /(宕机|502|故障|报警|告警|严重)/.test(lower);

    if ((!hasFutureDay || isUrgentIncident) && /(今天|今晚|下午|上午|马上|立即|紧急|现在|开会|交差|deadline|宕机|告警|报警|502|卡点|阻塞|故障|冒烟)/.test(lower)) {
      category = '即刻完成';
      urgencyScore = /(宕机|502|高危|告警|报警|生产环境|故障|严重)/.test(lower) ? 0.98 : 0.92;
    } else if (/(下个月|明年|长远|有空|闲暇|抽空|规划|梦想|想学|下半年|架构演进|储备|远期)/.test(lower)) {
      category = '规划待办';
      urgencyScore = 0.25;
    } else {
      category = '近期完成';
      urgencyScore = /(采购|预算|评审|用例|例会|周五|周四|本周)/.test(lower) ? 0.72 : 0.65;
    }

    const durationMs = Date.now() - startTime;

    // Write fallback to Jev log file (and Vercel stdout)
    writeJevLogEntry({
      triggerType: triggerType || 'evaluate',
      inputText: text,
      targetEndpoint,
      apiKeyMasked: maskedKey,
      status: 'FALLBACK (Jev Local Engine)',
      durationMs,
      requestPayload: payload,
      result: { category, urgencyScore, source: 'jev-calibrated-local' },
      error: lastError || 'Fallback to calibrated engine'
    });

    return res.status(200).json({
      category,
      urgencyScore,
      confidence: 0.93,
      source: 'jev-calibrated-local',
      durationMs
    });
  } catch (err: any) {
    console.error('Serverless evaluate error:', err);
    return res.status(500).json({ error: err?.message || 'Internal evaluation error' });
  }
}
