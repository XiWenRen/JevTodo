import { TaskItem } from '../types';

export interface PMScenarioDef {
  id: string;
  categoryName: string; // e.g. "服务器运维", "需求评审"
  iconType: 'alert' | 'test' | 'doc' | 'code' | 'chart' | 'cart' | 'wallet' | 'users' | 'flag' | 'server' | 'trash';
  title: string;
  rawInput: string;
  expectedCategory: '即刻完成' | '近期完成' | '规划待办';
  expectedPriority: 'P0' | 'P1' | 'P2' | 'P3';
  expectedTags: string[];
  description: string;
}

export const PM_SCENARIO_LIST: PMScenarioDef[] = [
  {
    id: 'pm-ops-urgent',
    categoryName: '服务器运维',
    iconType: 'alert',
    title: '生产环境网关 502 报警紧急排查',
    rawInput: '生产环境 8080 端口网关告警 502，下午2点前拉通运维与核心开发修复 #运维 #生产',
    expectedCategory: '即刻完成',
    expectedPriority: 'P0',
    expectedTags: ['运维', '生产'],
    description: '核心线上服务高危告警，必须立即排查并恢复服务，Jev 判定为即刻最高紧急 P0'
  },
  {
    id: 'pm-test-review',
    categoryName: '测试用例评审',
    iconType: 'test',
    title: '核心支付与退款用例评审会',
    rawInput: '今天下午3点组织核心订单与退款测试用例评审，确认冒烟卡点 #测试 #评审',
    expectedCategory: '即刻完成',
    expectedPriority: 'P1',
    expectedTags: ['测试', '评审'],
    description: 'QA 关键质量把控节点，今日必闭环并锁定测试准入条件'
  },
  {
    id: 'pm-prd-review',
    categoryName: '需求评审',
    iconType: 'doc',
    title: '供应链系统改造 PRD 终审锁定',
    rawInput: '今天17:00前完成供应链改造需求评审方案并锁定版本PRD #需求 #产品',
    expectedCategory: '即刻完成',
    expectedPriority: 'P1',
    expectedTags: ['需求', '产品'],
    description: '产品版本基线锁定，避免需求蔓延导致开发排期延期'
  },
  {
    id: 'pm-code-cr',
    categoryName: '代码开发',
    iconType: 'code',
    title: '结算微服务重构 CR 与发版跟进',
    rawInput: '下班前跟进结算微服务重构代码CR卡点与灰度发版计划 #研发 #进度',
    expectedCategory: '即刻完成',
    expectedPriority: 'P1',
    expectedTags: ['研发', '进度'],
    description: '开发核心模块代码审查，排查合并冲突与灰度环境验证卡点'
  },
  {
    id: 'pm-progress-sync',
    categoryName: '项目进度',
    iconType: 'chart',
    title: 'SaaS 项目双周例会与燃尽图更新',
    rawInput: '明天上午10点组织SaaS项目双周进度例会，评估延期风险并更新燃尽图 #项目 #管理',
    expectedCategory: '近期完成',
    expectedPriority: 'P2',
    expectedTags: ['项目', '管理'],
    description: '常规项目管理例会，对齐里程碑并识别跨团队依赖与阻碍'
  },
  {
    id: 'pm-procurement',
    categoryName: '采购申请',
    iconType: 'cart',
    title: 'AI 算力服务器集群采购申请与比价',
    rawInput: '本周四前提交AI算力服务器硬件采购申请与3家供应商比价单 #采购 #商务',
    expectedCategory: '近期完成',
    expectedPriority: 'P2',
    expectedTags: ['采购', '商务'],
    description: '硬件固定资产与私有化算力节点采购，需走公司 OA 商务比价流程'
  },
  {
    id: 'pm-budget',
    categoryName: '预算申报',
    iconType: 'wallet',
    title: '2027 财年 IT 基础设施与云资源预算申报',
    rawInput: '本周五下班前完成2027财年IT研发与云资源预算申报表 #预算 #财务',
    expectedCategory: '近期完成',
    expectedPriority: 'P2',
    expectedTags: ['预算', '财务'],
    description: '年度部门研发及公有云开销测算，协调财务部门预算审批基线'
  },
  {
    id: 'pm-people-1on1',
    categoryName: '人员管理',
    iconType: 'users',
    title: '资深架构师技术终面及试用期 1on1',
    rawInput: '后天下午安排资深架构师候选人技术终面及新员工试用期1on1面谈 #团队 #人事',
    expectedCategory: '近期完成',
    expectedPriority: 'P2',
    expectedTags: ['团队', '人事'],
    description: '人才梯队建设与团队心理关怀，梳理绩效考核与个人成长目标'
  },
  {
    id: 'pm-project-kickoff',
    categoryName: '立项申请',
    iconType: 'flag',
    title: '新一代分布式中台架构演进立项预研',
    rawInput: '下个月启动新一代分布式中台架构演进立项申请与ROI效益评估预研 #立项 #规划',
    expectedCategory: '规划待办',
    expectedPriority: 'P3',
    expectedTags: ['立项', '规划'],
    description: '长周期战略级技术改造项目，需准备商业回报与架构可行性答辩'
  },
  {
    id: 'pm-datacenter-migrate',
    categoryName: '机房迁移',
    iconType: 'server',
    title: '同城双活与跨机房灾备迁移方案论证',
    rawInput: '下半年启动同城双活与跨机房灾备迁移总体方案论证与演练规划 #机房迁移 #运维',
    expectedCategory: '规划待办',
    expectedPriority: 'P3',
    expectedTags: ['机房迁移', '运维'],
    description: '核心基础设施重大演进，涉及跨机房专线、光纤网络与停机割接演练'
  },
  {
    id: 'pm-stale-hardware-quote',
    categoryName: '停滞待清理任务',
    iconType: 'trash',
    title: '联系旧机房弱电供应商询问废旧机架回收报价',
    rawInput: '联系旧机房弱电供应商询问废旧机架回收报价 #运维 #采购',
    expectedCategory: '规划待办',
    expectedPriority: 'P3',
    expectedTags: ['运维', '采购'],
    description: '已停滞 8 天无推进的冗余边缘任务，用于测试 Jev 定期智能清理建议'
  }
];

/**
 * Generate full simulated dataset for Project Manager daily workload
 */
export function generatePMSimulatedTasks(): TaskItem[] {
  const now = Date.now();
  const ONE_HOUR = 3600 * 1000;
  const ONE_DAY = 86400 * 1000;

  return [
    {
      id: 'pm-task-1',
      title: '生产环境 8080 端口网关告警 502，拉通运维排查修复',
      rawInput: '生产环境 8080 端口网关告警 502，拉通运维与核心开发排查修复 #运维 #生产',
      category: '即刻完成',
      priority: 'P0',
      urgencyScore: 0.98,
      tags: ['运维', '生产'],
      dueDate: '今天 14:00',
      dueDateIso: new Date(now + ONE_HOUR * 1.5).toISOString(),
      dueTimestamp: now + ONE_HOUR * 1.5,
      completed: false,
      createdAt: now - ONE_HOUR * 1,
      updatedAt: now - ONE_HOUR * 1,
      jevConfidence: 0.98
    },
    {
      id: 'pm-task-2',
      title: '组织核心订单与退款测试用例评审，确认冒烟卡点',
      rawInput: '今天组织核心订单与退款测试用例评审，确认冒烟卡点 #测试 #评审',
      category: '即刻完成',
      priority: 'P1',
      urgencyScore: 0.92,
      tags: ['测试', '评审'],
      dueDate: '今天 18:00',
      dueDateIso: new Date(now + ONE_HOUR * 4).toISOString(),
      dueTimestamp: now + ONE_HOUR * 4,
      completed: false,
      createdAt: now - ONE_HOUR * 2,
      updatedAt: now - ONE_HOUR * 2,
      jevConfidence: 0.96
    },
    {
      id: 'pm-task-3',
      title: '完成供应链系统改造需求评审方案并锁定版本 PRD',
      rawInput: '完成供应链改造需求评审方案并锁定版本PRD #需求 #产品',
      category: '即刻完成',
      priority: 'P1',
      urgencyScore: 0.89,
      tags: ['需求', '产品'],
      dueDate: '明天 10:00',
      dueDateIso: new Date(now + ONE_DAY * 1).toISOString(),
      dueTimestamp: now + ONE_DAY * 1,
      completed: false,
      createdAt: now - ONE_HOUR * 3,
      updatedAt: now - ONE_HOUR * 3,
      jevConfidence: 0.95
    },
    {
      id: 'pm-task-4',
      title: '跟进结算微服务重构代码 CR 卡点与灰度发版计划',
      rawInput: '跟进结算微服务重构代码CR卡点与灰度发版计划 #研发 #进度',
      category: '即刻完成',
      priority: 'P1',
      urgencyScore: 0.85,
      tags: ['研发', '进度'],
      dueDate: '后天 18:30',
      dueDateIso: new Date(now + ONE_DAY * 2).toISOString(),
      dueTimestamp: now + ONE_DAY * 2,
      completed: false,
      createdAt: now - ONE_HOUR * 4,
      updatedAt: now - ONE_HOUR * 4,
      jevConfidence: 0.93
    },
    {
      id: 'pm-task-5',
      title: '明天上午10点组织 SaaS 项目双周进度例会，评估延期风险并更新燃尽图',
      rawInput: '明天上午10点组织SaaS项目双周进度例会，评估延期风险并更新燃尽图 #项目 #管理',
      category: '近期完成',
      priority: 'P2',
      urgencyScore: 0.72,
      tags: ['项目', '管理'],
      dueDate: '明天 10:00',
      dueDateIso: new Date(now + ONE_DAY).toISOString(),
      dueTimestamp: now + ONE_DAY,
      completed: false,
      createdAt: now - ONE_DAY * 0.5,
      updatedAt: now - ONE_DAY * 0.5,
      jevConfidence: 0.92
    },
    {
      id: 'pm-task-6',
      title: '本周四前提交 AI 算力服务器硬件采购申请与 3 家供应商比价单',
      rawInput: '本周四前提交AI算力服务器硬件采购申请与3家供应商比价单 #采购 #商务',
      category: '近期完成',
      priority: 'P2',
      urgencyScore: 0.68,
      tags: ['采购', '商务'],
      dueDate: '这周四 18:00',
      dueDateIso: new Date(now + ONE_DAY * 3).toISOString(),
      dueTimestamp: now + ONE_DAY * 3,
      completed: false,
      createdAt: now - ONE_DAY * 1,
      updatedAt: now - ONE_DAY * 1,
      jevConfidence: 0.91
    },
    {
      id: 'pm-task-7',
      title: '本周五下班前完成 2027 财年 IT 研发与云资源预算申报表',
      rawInput: '本周五下班前完成2027财年IT研发与云资源预算申报表 #预算 #财务',
      category: '近期完成',
      priority: 'P2',
      urgencyScore: 0.66,
      tags: ['预算', '财务'],
      dueDate: '这周五 18:00',
      dueDateIso: new Date(now + ONE_DAY * 4).toISOString(),
      dueTimestamp: now + ONE_DAY * 4,
      completed: false,
      createdAt: now - ONE_DAY * 1.5,
      updatedAt: now - ONE_DAY * 1.5,
      jevConfidence: 0.9
    },
    {
      id: 'pm-task-8',
      title: '安排资深架构师候选人技术终面及新员工试用期 1on1 面谈',
      rawInput: '后天下午安排资深架构师候选人技术终面及新员工试用期1on1面谈 #团队 #人事',
      category: '近期完成',
      priority: 'P2',
      urgencyScore: 0.62,
      tags: ['团队', '人事'],
      dueDate: '后天 15:00',
      dueDateIso: new Date(now + ONE_DAY * 2).toISOString(),
      dueTimestamp: now + ONE_DAY * 2,
      completed: false,
      createdAt: now - ONE_DAY * 1.8,
      updatedAt: now - ONE_DAY * 1.8,
      jevConfidence: 0.89
    },
    {
      id: 'pm-task-9',
      title: '启动新一代分布式中台架构演进立项申请与 ROI 效益评估预研',
      rawInput: '下个月启动新一代分布式中台架构演进立项申请与ROI效益评估预研 #立项 #规划',
      category: '规划待办',
      priority: 'P3',
      urgencyScore: 0.28,
      tags: ['立项', '规划'],
      dueDate: '下个月',
      completed: false,
      createdAt: now - ONE_DAY * 2,
      updatedAt: now - ONE_DAY * 2,
      jevConfidence: 0.93
    },
    {
      id: 'pm-task-10',
      title: '下半年启动同城双活与跨机房灾备迁移总体方案论证与演练规划',
      rawInput: '下半年启动同城双活与跨机房灾备迁移总体方案论证与演练规划 #机房迁移 #运维',
      category: '规划待办',
      priority: 'P3',
      urgencyScore: 0.22,
      tags: ['机房迁移', '运维'],
      dueDate: '下半年',
      completed: false,
      createdAt: now - ONE_DAY * 3,
      updatedAt: now - ONE_DAY * 3,
      jevConfidence: 0.94
    },
    {
      id: 'pm-task-11',
      title: '联系旧机房弱电供应商询问废旧机架回收报价',
      rawInput: '联系旧机房弱电供应商询问废旧机架回收报价 #运维 #采购',
      category: '规划待办',
      priority: 'P3',
      urgencyScore: 0.15,
      tags: ['运维', '采购'],
      completed: false,
      createdAt: now - ONE_DAY * 8, // 8 days ago -> stale!
      updatedAt: now - ONE_DAY * 8,
      jevConfidence: 0.88,
      isStale: true,
      cleanupSuggested: true,
      cleanupReason: '任务已停滞 8 天无更新，属于边缘冗余采购，Jev 建议归档或顺延'
    },
    {
      id: 'pm-task-12',
      title: '查阅 2024 年老旧微服务测试用例历史归档目录',
      rawInput: '查阅 2024 年老旧微服务测试用例历史归档目录 #测试',
      category: '规划待办',
      priority: 'P3',
      urgencyScore: 0.1,
      tags: ['测试'],
      completed: false,
      createdAt: now - ONE_DAY * 14, // 14 days ago -> stale!
      updatedAt: now - ONE_DAY * 14,
      jevConfidence: 0.85,
      isStale: true,
      cleanupSuggested: true,
      cleanupReason: '任务创建已超 14 天未推进，用例已过时，Jev 建议直接归档'
    }
  ];
}

export function getOnboardingTasks(): TaskItem[] {
  const now = new Date();
  
  // Today 18:00
  const today18 = new Date(now);
  today18.setHours(18, 0, 0, 0);
  const pad = (n: number) => n.toString().padStart(2, '0');
  const today18Iso = `${today18.getFullYear()}-${pad(today18.getMonth() + 1)}-${pad(today18.getDate())}T18:00:00`;

  // Tomorrow 10:00
  const tomorrow10 = new Date(now.getTime() + 24 * 3600 * 1000);
  tomorrow10.setHours(10, 0, 0, 0);
  const tomorrow10Iso = `${tomorrow10.getFullYear()}-${pad(tomorrow10.getMonth() + 1)}-${pad(tomorrow10.getDate())}T10:00:00`;

  return [
    {
      id: 'guide-task-gesture',
      title: '长按此任务：体验扇形手势整理（完成 / 延后 / 删除）',
      rawInput: '长按此任务：体验扇形手势整理（完成 / 延后 / 删除） 今天 18:00 #新手引导 #手势交互',
      category: '即刻完成',
      priority: 'P1',
      urgencyScore: 0.9,
      tags: ['新手引导', '手势交互'],
      dueDate: '今天 18:00',
      dueDateIso: today18Iso,
      dueTimestamp: today18.getTime(),
      completed: false,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      notes: [
        '按住卡片触发扇形轮盘，手指滑向左侧删除、中间延后、右侧完成'
      ]
    },
    {
      id: 'guide-task-input',
      title: '在下方输入框试试自然语言录入',
      rawInput: '在下方输入框试试自然语言录入 明天 10:00 #新手引导 #智能解析',
      category: '近期完成',
      priority: 'P2',
      urgencyScore: 0.6,
      tags: ['新手引导', '智能解析'],
      dueDate: '明天 10:00',
      dueDateIso: tomorrow10Iso,
      dueTimestamp: tomorrow10.getTime(),
      completed: false,
      createdAt: now.getTime() - 1000,
      updatedAt: now.getTime() - 1000,
      notes: [
        '直接输入如「明天上午10点评审方案 #产品」，AI 将自动识别时间、分类与标签'
      ]
    }
  ];
}
