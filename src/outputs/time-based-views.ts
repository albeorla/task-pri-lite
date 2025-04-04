/**
 * Time-Based Views for Task Priority Lite
 * 
 * This module provides functionality for generating different time-based views
 * of tasks for different planning horizons.
 */

import { TaskItem } from '../storage/task-store';

/**
 * Enum for different time horizons
 */
export enum TimeHorizon {
  TODAY = 'Today',
  TOMORROW = 'Tomorrow',
  THIS_WORK_WEEK = 'This Work Week',
  THIS_WEEKEND = 'This Weekend',
  NEXT_WEEK = 'Next Week',
  NEXT_MONTH = 'Next Month',
  NEXT_QUARTER = 'Next Quarter',
  NEXT_YEAR = 'Next Year'
}

/**
 * Class for generating time-based views of tasks
 */
export class TimeBasedViewGenerator {
  
  private tasks: TaskItem[];
  
  /**
   * Constructor
   * @param tasks Array of tasks to generate views from
   */
  constructor(tasks: TaskItem[]) {
    this.tasks = tasks;
  }
  
  /**
   * Generate a view for a specific time horizon
   * @param horizon Time horizon to generate view for
   * @returns Filtered and sorted tasks for the horizon
   */
  public generateView(horizon: TimeHorizon): TaskItem[] {
    const now = new Date();
    let filteredTasks: TaskItem[] = [];
    
    switch(horizon) {
      case TimeHorizon.TODAY:
        filteredTasks = this.filterTasksDueToday(now);
        break;
      case TimeHorizon.TOMORROW:
        filteredTasks = this.filterTasksDueTomorrow(now);
        break;
      case TimeHorizon.THIS_WORK_WEEK:
        filteredTasks = this.filterTasksDueThisWorkWeek(now);
        break;
      case TimeHorizon.THIS_WEEKEND:
        filteredTasks = this.filterTasksDueThisWeekend(now);
        break;
      case TimeHorizon.NEXT_WEEK:
        filteredTasks = this.filterTasksDueNextWeek(now);
        break;
      case TimeHorizon.NEXT_MONTH:
        filteredTasks = this.filterTasksDueNextMonth(now);
        break;
      case TimeHorizon.NEXT_QUARTER:
        filteredTasks = this.filterTasksDueNextQuarter(now);
        break;
      case TimeHorizon.NEXT_YEAR:
        filteredTasks = this.filterTasksDueNextYear(now);
        break;
    }
    
    // Sort by priority and due date
    return this.sortTasksByPriorityAndDueDate(filteredTasks);
  }
  
  /**
   * Sort tasks by priority first, then by due date
   */
  private sortTasksByPriorityAndDueDate(tasks: TaskItem[]): TaskItem[] {
    return [...tasks].sort((a, b) => {
      // Sort by priority first (lower number = higher priority)
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      
      // Then sort by due date if both have due dates
      if (a.dueDate && b.dueDate) {
        return a.dueDate.getTime() - b.dueDate.getTime();
      }
      
      // Tasks with due dates come before tasks without
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      
      // If no criteria matches, maintain original order
      return 0;
    });
  }
  
  /**
   * Filter tasks due today and overdue
   */
  private filterTasksDueToday(now: Date): TaskItem[] {
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      
      // Include highest priority tasks without due dates
      if (!task.dueDate && task.priority === 0) return true;
      
      if (!task.dueDate) return false;
      
      // Include tasks due today and overdue tasks
      return task.dueDate <= this.getEndOfDay(now);
    });
  }
  
  /**
   * Filter tasks due tomorrow
   */
  private filterTasksDueTomorrow(now: Date): TaskItem[] {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      return this.isSameDay(task.dueDate, tomorrow);
    });
  }
  
  /**
   * Filter tasks due this work week (Monday to Friday)
   */
  private filterTasksDueThisWorkWeek(now: Date): TaskItem[] {
    const startOfWeek = this.getStartOfWorkWeek(now);
    const endOfWeek = this.getEndOfWorkWeek(now);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due this work week
      return task.dueDate >= startOfWeek && task.dueDate <= endOfWeek;
    });
  }
  
  /**
   * Filter tasks due this weekend (Saturday and Sunday)
   */
  private filterTasksDueThisWeekend(now: Date): TaskItem[] {
    const startOfWeekend = this.getStartOfWeekend(now);
    const endOfWeekend = this.getEndOfWeekend(now);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due this weekend
      return task.dueDate >= startOfWeekend && task.dueDate <= endOfWeekend;
    });
  }
  
  /**
   * Filter tasks due next week (next Monday to Sunday)
   */
  private filterTasksDueNextWeek(now: Date): TaskItem[] {
    const endOfThisWeek = this.getEndOfWeekend(now);
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(startOfNextWeek.getDate() + 1);
    
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    endOfNextWeek.setHours(23, 59, 59, 999);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due next week
      return task.dueDate > endOfThisWeek && task.dueDate <= endOfNextWeek;
    });
  }
  
  /**
   * Filter tasks due next month
   */
  private filterTasksDueNextMonth(now: Date): TaskItem[] {
    const today = new Date(now);
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    const endOfNextMonth = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59, 999);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due next month
      return task.dueDate >= startOfNextMonth && task.dueDate <= endOfNextMonth;
    });
  }
  
  /**
   * Filter tasks due next quarter (next 3 months)
   */
  private filterTasksDueNextQuarter(now: Date): TaskItem[] {
    const today = new Date(now);
    const startOfNextQuarter = new Date(today);
    startOfNextQuarter.setMonth(today.getMonth() + 3);
    startOfNextQuarter.setDate(1);
    startOfNextQuarter.setHours(0, 0, 0, 0);
    
    const endOfNextQuarter = new Date(startOfNextQuarter);
    endOfNextQuarter.setMonth(startOfNextQuarter.getMonth() + 3);
    endOfNextQuarter.setDate(0);
    endOfNextQuarter.setHours(23, 59, 59, 999);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due next quarter
      return task.dueDate >= startOfNextQuarter && task.dueDate <= endOfNextQuarter;
    });
  }
  
  /**
   * Filter tasks due next year
   */
  private filterTasksDueNextYear(now: Date): TaskItem[] {
    const today = new Date(now);
    const nextYear = today.getFullYear() + 1;
    
    const startOfNextYear = new Date(nextYear, 0, 1);
    const endOfNextYear = new Date(nextYear, 11, 31, 23, 59, 59, 999);
    
    return this.tasks.filter(task => {
      if (task.completed) return false; // Skip completed tasks
      if (!task.dueDate) return false;
      
      // Include tasks due next year
      return task.dueDate >= startOfNextYear && task.dueDate <= endOfNextYear;
    });
  }
  
  /**
   * Check if two dates are the same day
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }
  
  /**
   * Get the end of the day for a date
   */
  private getEndOfDay(date: Date): Date {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    return endOfDay;
  }
  
  /**
   * Get the start of the work week (Monday) for a date
   */
  private getStartOfWorkWeek(date: Date): Date {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days to previous Monday
    
    const monday = new Date(date);
    monday.setDate(date.getDate() + mondayOffset);
    monday.setHours(0, 0, 0, 0);
    
    return monday;
  }
  
  /**
   * Get the end of the work week (Friday) for a date
   */
  private getEndOfWorkWeek(date: Date): Date {
    const startOfWorkWeek = this.getStartOfWorkWeek(date);
    const endOfWorkWeek = new Date(startOfWorkWeek);
    endOfWorkWeek.setDate(startOfWorkWeek.getDate() + 4); // Friday is 4 days after Monday
    endOfWorkWeek.setHours(23, 59, 59, 999);
    
    return endOfWorkWeek;
  }
  
  /**
   * Get the start of the weekend (Saturday) for a date
   */
  private getStartOfWeekend(date: Date): Date {
    const startOfWorkWeek = this.getStartOfWorkWeek(date);
    const startOfWeekend = new Date(startOfWorkWeek);
    startOfWeekend.setDate(startOfWorkWeek.getDate() + 5); // Saturday is 5 days after Monday
    startOfWeekend.setHours(0, 0, 0, 0);
    
    return startOfWeekend;
  }
  
  /**
   * Get the end of the weekend (Sunday) for a date
   */
  private getEndOfWeekend(date: Date): Date {
    const startOfWeekend = this.getStartOfWeekend(date);
    const endOfWeekend = new Date(startOfWeekend);
    endOfWeekend.setDate(startOfWeekend.getDate() + 1); // Sunday is 1 day after Saturday
    endOfWeekend.setHours(23, 59, 59, 999);
    
    return endOfWeekend;
  }
} 