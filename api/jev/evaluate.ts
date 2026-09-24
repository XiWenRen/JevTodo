import { writeJevLogEntry } from '../../server/jevFileLogger.js';
import { resolveJevDateTime } from '../../server/jevTimeHelper.js';

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
    const { text, apiKey, endpoint, triggerType, allowFallback } = req.body || {};
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
            matter_tag: {
              type: 'choice',
              instructions: '该待办事项最匹配的业务事件或技术领域分类标签是什么？',
              criteria: {
                '网关排查': '502/500/网关/端口/告警排查与服务恢复',
                '生产排查': '生产环境故障、线上紧急异常排查',
                '用例评审': '测试用例、冒烟测试、功能评审',
                '代码审查': '代码CR、Review、合并卡点处理',
                '灰度发版': '版本发布、灰度上线、发版跟进',
                '中台同步': '中台数据对接、接口对齐、同步联调',
                '接口联调': '前后端接口对接、API调试、服务联调',
                '微服务重构': '服务化改造、结算微服务重构',
                '数据库备份': '数据库全量/增量备份、快照容灾',
                '双周例会': '项目进度双周例会、站会',
                '燃尽图': '燃尽图更新、甘特图与进度管理',
                '硬件采购': '算力服务器硬件采购、设备选型',
                '供应商比价': '三家比价单、供应商招投标比价',
                '预算申报': '财年IT研发与云资源预算申报',
                '架构师终面': '资深技术终面、专家面试',
                '试用期1on1': '试用期沟通、绩效面谈、转正答辩',
                '医疗体检': '就医检查、胃镜、医院门诊体检',
                '运动健身': '健身房力量训练、跑步打卡',
                '生活琐事': '日常超市购物、生鲜买菜、生活缴费',
                '语言学习': '托福、雅思、外语备考、学习规划',
                '常规待办': '其他未明确归类的常规工作或生活事项'
              }
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
              instructions: '该任务是否有明确的执行时段倾向？',
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
              instructions: '该任务如果指定了具体的几点钟执行，请选择对应的点钟；若未指定具体点钟请选择未指定。',
              criteria: {
                '09:00': '上午9点左右',
                '10:00': '上午10点左右',
                '11:00': '上午11点左右',
                '14:00': '下午2点（14点）左右',
                '15:00': '下午3点（15点）左右',
                '16:00': '下午4点（16点）左右',
                '17:00': '下午5点（17点）左右',
                '20:00': '晚上8点（20点）左右',
                '21:00': '晚上9点（21点）左右',
                '未指定具体点钟': '未提及具体几点钟'
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
            category,
            urgencyScore,
            tags: jevTags,
            dueDate,
            dueDateIso,
            dueTimestamp,
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
      result: { category, urgencyScore, source: 'cherry-calibrated-local' },
      error: lastError || 'Fallback to calibrated engine'
    });

    return res.status(200).json({
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
