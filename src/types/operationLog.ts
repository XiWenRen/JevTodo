import { TaskCategory } from '../types';

export type OperationType =
  | 'jev_auto_organize'   // Jev 智能自动整理（多任务聚合）
  | 'jev_daily_evolve'    // Jev 每日日程智能演变流转
  | 'task_create'         // 创建待办
  | 'task_complete'       // 标记完成
  | 'task_uncomplete'     // 取消完成
  | 'task_delete'         // 删除待办
  | 'task_update'         // 修改待办
  | 'task_defer'          // 顺延待办
  | 'gesture_organize'    // 扇形手势整理
  | 'batch_split';        // 智能批量拆分

export interface TaskSnapshot {
  id: string;
  title: string;
  category: TaskCategory;
  completed: boolean;
  dueDate?: string;
  tags?: string[];
  actionNote?: string;    // e.g. "已顺延至明天", "标记已完成", "沉淀归档"
}

export interface OperationLogItem {
  id: string;
  userId?: string;        // 关联用户 ID，实现用户维度数据隔离
  timestamp: number;
  type: OperationType;
  title: string;          // 简明标题，如 "Jev 智能决策整理", "创建待办", "手势延后"
  description: string;    // 详细说明，如 "智能重排 5 项待办顺序，顺延 2 项逾期事项"
  affectedCount: number;  // 本次操作影响的任务数
  taskSnapshots: TaskSnapshot[]; // 本次操作关联的具体任务快照清单
}
