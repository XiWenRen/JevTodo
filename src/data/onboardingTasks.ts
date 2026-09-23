import { TaskItem } from '../types';

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
      title: '长按此任务：体验樱桃投喂小动物（完成 / 延后 / 删除）',
      rawInput: '长按此任务：体验樱桃投喂小动物（完成 / 延后 / 删除） 今天 18:00 #新手引导 #手势交互',
      category: '即刻完成',
      urgencyScore: 0.9,
      tags: ['新手引导', '手势交互'],
      dueDate: '今天 18:00',
      dueDateIso: today18Iso,
      dueTimestamp: today18.getTime(),
      completed: false,
      createdAt: now.getTime(),
      updatedAt: now.getTime(),
      notes: [
        '按住卡片拖拽樱桃，滑向左侧小恐龙删除、中间树懒延后、右侧小松鼠完成'
      ]
    },
    {
      id: 'guide-task-input',
      title: '在下方输入框试试自然语言录入',
      rawInput: '在下方输入框试试自然语言录入 明天 10:00 #新手引导 #智能解析',
      category: '近期完成',
      urgencyScore: 0.6,
      tags: ['新手引导', '智能解析'],
      dueDate: '明天 10:00',
      dueDateIso: tomorrow10Iso,
      dueTimestamp: tomorrow10.getTime(),
      completed: false,
      createdAt: now.getTime() - 1000,
      updatedAt: now.getTime() - 1000,
      notes: [
        '直接输入如「明天上午10点评审方案 #产品」，AI 将自动识别时间、分类与具体事情标签'
      ]
    }
  ];
}
