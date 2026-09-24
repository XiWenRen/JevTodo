import { useState, useCallback } from 'react';
import { TaskItem } from '../types';

export function useCherryFocus() {
  const [cherryActiveTask, setCherryActiveTask] = useState<TaskItem | null>(null);
  const [isCherryModalOpen, setIsCherryModalOpen] = useState(false);

  const handleStartCherryClock = useCallback((task: TaskItem) => {
    setCherryActiveTask(task);
    setIsCherryModalOpen(true);
  }, []);

  const handleCloseCherryModal = useCallback(() => {
    setIsCherryModalOpen(false);
    setCherryActiveTask(null);
  }, []);

  return {
    cherryActiveTask,
    isCherryModalOpen,
    handleStartCherryClock,
    handleCloseCherryModal
  };
}
