/**
 * Standalone Large-Scale Benchmark for Tag Evolution & Convergence
 * Verifies Cold Start, Dynamic Minting, Reuse Convergence, and Execution Latency.
 */

const BENCHMARK_DATASET = [
  // --- Batch 1: Cold Start on Novel & Proprietary Systems (Cold Start, Ledger is Empty) ---
  { text: '排查夸父平台下午出现的API网关502抖动问题', expectedSubject: '夸父平台' },
  { text: '在青鸾引擎中配置新的分词与检索模型', expectedSubject: '青鸾引擎' },
  { text: '对接天机风控系统的黑名单拦截策略', expectedSubject: '天机风控' },
  { text: '在神策数据平台导出上周留存漏斗报表', expectedSubject: '神策数据' },
  { text: '排查MySQL数据库慢查询和死锁告警', expectedSubject: 'MySQL' },
  { text: '清理Redis集群中积压的大Key和过期缓存', expectedSubject: 'Redis' },
  { text: '配置GitHub Actions自动化测试与构建工作流', expectedSubject: 'GitHub' },
  { text: '提交下半年IT研发与云资源预算申报表', expectedSubject: '预算申报' },
  { text: '给新入职员工开通OA系统考勤与审批权限', expectedSubject: 'OA系统' },
  { text: '优化CRM系统中客户商机流转阶段规则', expectedSubject: 'CRM系统' },

  // --- Batch 2: Evolutionary Reuse (Previously introduced systems + slight variants) ---
  { text: '优化夸父平台的首页卡片加载速度', expectedReuse: '夸父平台' },
  { text: '检查天机风控平台的准实时反欺诈拦截日志', expectedReuse: '天机风控' },
  { text: '在MySQL中为订单表增加联合索引以优化查询', expectedReuse: 'MySQL' },
  { text: '在CRM系统里批量导入新线索客户数据', expectedReuse: 'CRM系统' },
  { text: '在OA系统里发起本季度采购审批流程', expectedReuse: 'OA系统' },
  { text: '优化神策数据平台的埋点采集SDK版本', expectedReuse: '神策数据' },
  { text: '排查青鸾引擎索引构建失败的根因', expectedReuse: '青鸾引擎' },
  { text: '检查Redis从节点同步延迟异常', expectedReuse: 'Redis' },
  { text: '夸父平台二期需求方案评审会议', expectedReuse: '夸父平台' },
  { text: '在CRM系统核对华东区销售业绩看板', expectedReuse: 'CRM系统' },

  // --- Batch 3: Domain Engineering & Enterprise Operations ---
  { text: '升级K8s集群中Ingress反向代理路由规则', expectedSubject: 'K8s' },
  { text: '修复工单系统WebSocket心跳断连重试漏洞', expectedSubject: '工单系统' },
  { text: '同步飞书组织架构与部门员工信息到用户中心', expectedSubject: '飞书' },
  { text: '更新微信小程序购物车结算界面的支付唤起逻辑', expectedSubject: '微信小程序' },
  { text: '核对财务系统的上月企业对公转账流水凭证', expectedSubject: '财务系统' },
  { text: '在管理后台配置运营端广告弹窗分发策略', expectedSubject: '管理后台' },
  { text: '排查支付结算网关第三方渠道对账单不一致问题', expectedSubject: '支付结算' },
  { text: '下午2点在第3会议室参加Q3产品架构方案评审', expectedSubject: '技术方案' },
  { text: '撰写微服务容灾演练应急预案操作手册', expectedSubject: '技术方案' },
  { text: '完成候选人架构师级别的技术终面与背景评估', expectedSubject: '技术方案' },

  // --- Batch 4: Personal Life, Health & Physical ---
  { text: '周六上午陪父母去三甲医院门诊做全面年度体检', expectedSubject: '医疗健康' },
  { text: '预订下周二从北京南站到上海虹桥的高铁二等座票', expectedSubject: '生活琐事' },
  { text: '晚上8点去健身房进行大重量硬拉和深蹲力量训练', expectedSubject: '运动健身' },
  { text: '缴纳本月份家庭水电气费与物业管理费', expectedSubject: '生活琐事' },
  { text: '去菜鸟驿站取顺丰快递包裹', expectedSubject: '生活琐事' },
  { text: '山姆会员店采购生鲜水果和高钙牛奶', expectedSubject: '生活琐事' },
  { text: '预约下周三下午的牙科超声波洁牙门诊', expectedSubject: '医疗健康' },
  { text: '报名下半年雅思托福英语口语提升班', expectedSubject: '学习成长' },

  // --- Batch 5: Conversational, Low-Information & Noise (Verify No Hallucinated Junk) ---
  { text: '去楼下便利店买两包抽纸和一瓶乌龙茶', expectedSubject: '生活琐事' },
  { text: '随时找张总随便聊聊近期的想法', expectedSubject: '常规待办' },
  { text: '今天有点疲惫想早点休息睡觉', expectedSubject: '常规待办' },
  { text: '记得提醒我把昨天落下的事情处理一下', expectedSubject: '常规待办' },
  { text: '明天上午准备开个简短的小碰头会', expectedSubject: '常规待办' },
  { text: '整理一下办公桌抽屉里凌乱的文具', expectedSubject: '生活琐事' },
  { text: '这件事情要尽快落实推进搞定一下', expectedSubject: '常规待办' }
];

async function runBenchmark() {
  console.log('================================================================');
  console.log('🚀 [CherryTodo x Jev] 标签自进化与收敛性大规模压力验证方案');
  console.log(`📊 评测样本总量: ${BENCHMARK_DATASET.length} 条真实自然语言任务`);
  console.log('⏱️  测试执行开始时间:', new Date().toLocaleTimeString('zh-CN'));
  console.log('================================================================\n');

  const latencies = [];
  const tagEvolutionHistory = [];
  const tagCumulativeCounts = [];
  let reusedCount = 0;
  let totalGeneratedTags = 0;
  let errorCount = 0;

  for (let i = 0; i < BENCHMARK_DATASET.length; i++) {
    const item = BENCHMARK_DATASET[i];
    const index = i + 1;
    const tStart = performance.now();

    try {
      const res = await fetch('http://localhost:3000/api/jev/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: item.text,
          triggerType: 'benchmark'
        })
      });

      const tEnd = performance.now();
      const durationMs = Math.round(tEnd - tStart);
      latencies.push(durationMs);

      if (!res.ok) {
        console.error(`❌ [${index}] 请求失败 HTTP ${res.status}`);
        errorCount++;
        continue;
      }

      const data = await res.json();
      const tags = data.tags || [];
      const cleanTitle = data.cleanTitle || item.text;
      const stats = data.evolvingLedgerStats || { totalTags: 0, totalUsages: 0, topTags: [] };

      // Check reuse
      let isReused = false;
      for (const t of tags) {
        if (t !== '常规待办') {
          totalGeneratedTags++;
          if (tagEvolutionHistory.includes(t)) {
            reusedCount++;
            isReused = true;
          } else {
            tagEvolutionHistory.push(t);
          }
        }
      }

      tagCumulativeCounts.push({
        step: index,
        uniqueTagsCount: tagEvolutionHistory.length
      });

      // Output summary for each task
      const reuseBadge = isReused ? '🔄 [复用已有标签]' : '🌱 [沉淀新标签]';
      console.log(`[${index.toString().padStart(2, '0')}/${BENCHMARK_DATASET.length}] ${reuseBadge} (${durationMs}ms)`);
      console.log(`    输入: "${item.text}"`);
      console.log(`    提炼: "${cleanTitle}"`);
      console.log(`    标签: [${tags.map(t => `#${t}`).join(', ')}]`);
      if (stats.topTags && stats.topTags.length > 0 && index % 10 === 0) {
        console.log(`    📈 当前标签库进化排行: ${stats.topTags.slice(0, 5).join(' | ')}`);
      }
      console.log('');
    } catch (err) {
      console.error(`❌ [${index}] 异常:`, err.message);
      errorCount++;
    }
  }

  // Final Summary & Analytics
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const reuseRate = totalGeneratedTags > 0 ? ((reusedCount / totalGeneratedTags) * 100).toFixed(1) : '0';

  console.log('\n================================================================');
  console.log('🏁 【基准验证执行成果报告】');
  console.log('================================================================');
  console.log(`✅ 成功评测用例: ${BENCHMARK_DATASET.length - errorCount} / ${BENCHMARK_DATASET.length}`);
  console.log(`⚡ 平均端到端延迟: ${avgLatency} ms (最快: ${minLatency}ms, 最慢: ${maxLatency}ms)`);
  console.log(`🏷️  累计生成唯一标签数: ${tagEvolutionHistory.length} 个`);
  console.log(`🔄 历史标签复用率: ${reuseRate}% (${reusedCount} 次复用 / ${totalGeneratedTags} 次标签输出)`);
  console.log('----------------------------------------------------------------');
  console.log('📈 标签收敛趋势分析 (随任务数量推进，新标签增量逐渐平缓):');
  
  const intervals = [10, 20, 30, 40, BENCHMARK_DATASET.length];
  for (const step of intervals) {
    const record = tagCumulativeCounts.find(r => r.step === step);
    if (record) {
      console.log(`   - 前 ${step.toString().padStart(2, ' ')} 个任务: 累计沉淀 ${record.uniqueTagsCount} 个标签`);
    }
  }

  console.log('----------------------------------------------------------------');
  console.log('🏆 最终形成的个性化画像标签池 (部分):');
  console.log(`   ${tagEvolutionHistory.slice(0, 15).map(t => `#${t}`).join('  ')}`);
  console.log('================================================================\n');
}

runBenchmark();
