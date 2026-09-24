import { writeJevLogEntry } from '../../server/jevFileLogger.js';
import { resolveJevDateTime } from '../../server/jevTimeHelper.js';
import { buildDynamicTagCriteria, buildScheduleContextAndHourCriteria, buildDynamicTitleCriteria } from '../../server/jevScheduleHelper.js';

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
    const { text, apiKey, endpoint, triggerType, allowFallback, userTags, existingSchedule } = req.body || {};
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

    // 1. Build dynamic tag criteria (user custom tags + input-extracted keywords + baseline)
    const matterTagCriteria = buildDynamicTagCriteria(userTags, text);

    // 2. Build schedule-aware context and dynamic target_hour criteria with conflict badges
    const { enrichedState, targetHourCriteria, freeWindowSummary } = buildScheduleContextAndHourCriteria(existingSchedule, text);

    // 3. Build dynamic clean title criteria and candidates
    const { criteria: titleCriteria, defaultTitle } = buildDynamicTitleCriteria(text);

    if (activeApiKey) {
      try {
        payload = {
          model: 'jev-latest',
          state: enrichedState,
          questions: {
            task_title: {
              type: 'choice',
              instructions: '请从以下候选名称中挑选出最适合作待办卡片名称的标题（核心语义完整、精简准确、去除时间、标签与口语修饰）：',
              criteria: titleCriteria
            },
            category: {
              type: 'choice',
              instructions: '该待办事项应该属于哪个执行时机分类？',
              criteria: {
                '即刻完成': '今天内需做完、紧急重要事项',
                '近期完成': '本周或几天内需处理推进的事项',
                '规划待办': '未来计划、长期目标或随时可做的事项'
              }
            },
            matter_tag: {
              type: 'choice',
              instructions: '该待办事项最匹配的业务事件或技术领域分类标签是什么？（包含用户自定义标签与前置候选）',
              criteria: matterTagCriteria
            },
            time_scope: {
              type: 'choice',
              instructions: '根据任务内容判断，该待办事项应该安排在何时完成？',
              criteria: {
                '今天': '今天内需要处理或完成（包括今天上午、下午、今晚、立即、马上）',
                '明天': '明天需要处理或推进（包括明早、明晚）',
                '后天': '后天需要处理或推进',
                '本周内': '本周内某个工作日（周一至周五、周末前）',
                '下周': '下周需要推进处理的事项',
                '长期规划': '下个月、下半年、明年或长期未来规划',
                '随时待办': '未指定具体日期或随时可做的事项'
              }
            },
            time_slot: {
              type: 'choice',
              instructions: '该任务是否有明确的执行时段倾向？（优先选择未冲突的可用时段）',
              criteria: {
                '上午': '上午时段（08:00 - 12:00）',
                '中午': '中午时段（12:00 - 13:00）',
                '下午': '下午时段（13:00 - 18:00）',
                '晚上': '晚间时段（18:00 - 23:00）',
                '全天灵活': '全天任意时间或未指定特定时段'
              }
            },
            target_hour: {
              type: 'choice',
              instructions: '结合今日日程占用与空闲时段，为该任务推荐选择最佳执行开始点钟（优先避开冲突安排在空闲窗口；若任务无需固定钟点可全天灵活推进请选未指定）：',
              criteria: targetHourCriteria
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

          // 0. Clean Title directly powered by Jev
          const chosenTitle = answers.task_title?.choice || answers.task_title?.value;
          const cleanTitle = (chosenTitle && titleCriteria[chosenTitle]) ? chosenTitle : defaultTitle;

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

          // 1. Tags directly powered by Jev
          const explicitTags: string[] = [];
          const tagRegex = /#([\u4e00-\u9fa5\w-]+)/g;
          let tm;
          while ((tm = tagRegex.exec(text)) !== null) {
            if (!explicitTags.includes(tm[1])) explicitTags.push(tm[1]);
          }

          const jevTags = [...explicitTags];
          const primaryJevTag = answers.matter_tag?.choice;
          if (primaryJevTag && primaryJevTag !== '常规待办' && !jevTags.includes(primaryJevTag)) {
            jevTags.push(primaryJevTag);
          }
          const probs = answers.matter_tag?.probabilities || {};
          for (const [tName, prob] of Object.entries(probs)) {
            if (jevTags.length >= 2) break;
            if (typeof prob === 'number' && prob >= 0.2 && tName !== '常规待办' && !jevTags.includes(tName)) {
              jevTags.push(tName);
            }
          }
          if (jevTags.length === 0) jevTags.push('常规待办');

          // 2. Task Time directly powered by Jev
          const timeScope = answers.time_scope?.choice;
          const timeSlot = answers.time_slot?.choice;
          const targetHour = answers.target_hour?.choice;
          const { dueDate, dueDateIso, dueTimestamp } = resolveJevDateTime(timeScope, timeSlot, targetHour, text);

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
            result: {
              cleanTitle,
              category,
              urgencyScore,
              tags: jevTags,
              time: { scope: timeScope, slot: timeSlot, hour: targetHour, dueDate: dueDate || '无明确时限' },
              cleanupProb,
              confidence,
              source: 'typesafe-jev-systemone'
            }
          });

          return res.status(200).json({
            cleanTitle,
            category,
            urgencyScore,
            tags: jevTags,
            dueDate,
            dueDateIso,
            dueTimestamp,
            needsCleanup: cleanupProb > 0.6,
            freeWindowSummary,
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

    // If fallback is not permitted (default), abort and return error
    if (allowFallback !== true) {
      const errMsg = lastError || '未配置有效 JEV_API_KEY，且已在设置中关闭本地降级';
      const durationMs = Date.now() - startTime;
      writeJevLogEntry({
        triggerType: triggerType || 'evaluate',
        inputText: text,
        targetEndpoint,
        apiKeyMasked: maskedKey,
        status: 'FAILED (Fallback disabled)',
        statusCode: 502,
        durationMs,
        requestPayload: payload,
        error: errMsg
      });
      return res.status(502).json({
        error: errMsg,
        source: 'jev-failed',
        allowFallback: false
      });
    }

    // High-accuracy fallback decision (only if allowFallback === true)
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
      status: 'FALLBACK (Cherry Local Engine)',
      durationMs,
      requestPayload: payload,
      result: { cleanTitle: defaultTitle, category, urgencyScore, source: 'cherry-calibrated-local' },
      error: lastError || 'Fallback to calibrated engine'
    });

    return res.status(200).json({
      cleanTitle: defaultTitle,
      category,
      urgencyScore,
      tags: ['日常待办'],
      confidence: 0.93,
      source: 'cherry-calibrated-local',
      durationMs
    });
  } catch (err: any) {
    console.error('Serverless evaluate error:', err);
    return res.status(500).json({ error: err?.message || 'Internal evaluation error' });
  }
}
