// Offline Support and Action Queue Management for Gloup ✨
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { supabase } from './supabase';
import { AnalyticsManager } from './analytics';

interface OfflineAction {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
  priority: 'high' | 'medium' | 'low';
}

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean;
  type: string;
}

export class OfflineManager {
  private static instance: OfflineManager;
  private queue: OfflineAction[] = [];
  private isProcessing = false;
  private networkState: NetworkState = {
    isConnected: false,
    isInternetReachable: false,
    type: 'unknown',
  };
  private listeners: ((isOnline: boolean) => void)[] = [];

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  private constructor() {
    this.initialize();
  }

  // Initialize offline manager
  private async initialize(): Promise<void> {
    // Load queued actions from storage
    await this.loadQueue();

    // Set up network monitoring
    this.setupNetworkMonitoring();

    // Start processing queue
    this.startQueueProcessor();
  }

  // Set up network state monitoring
  private setupNetworkMonitoring(): void {
    NetInfo.addEventListener(state => {
      const wasOnline = this.networkState.isConnected && this.networkState.isInternetReachable;
      
      this.networkState = {
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
        type: state.type,
      };

      const isOnline = this.networkState.isConnected && this.networkState.isInternetReachable;

      // Notify listeners
      this.listeners.forEach(listener => listener(isOnline));

      // If we just came online, process the queue
      if (!wasOnline && isOnline) {
        AnalyticsManager.trackEvent('network_reconnected');
        this.processQueue();
      } else if (wasOnline && !isOnline) {
        AnalyticsManager.trackEvent('network_disconnected');
      }
    });
  }

  // Add action to queue
  async queueAction(action: Omit<OfflineAction, 'id' | 'retryCount'>): Promise<void> {
    const queuedAction: OfflineAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36),
      retryCount: 0,
    };

    this.queue.push(queuedAction);
    await this.saveQueue();

    AnalyticsManager.trackEvent('action_queued', {
      type: action.type,
      priority: action.priority,
    });

    // Try to process immediately if online
    if (this.isOnline()) {
      this.processQueue();
    }
  }

  // Process the action queue
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.isOnline() || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // Sort by priority and timestamp
      this.queue.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });

      const actionsToProcess = [...this.queue];
      const processedActions: string[] = [];

      for (const action of actionsToProcess) {
        try {
          await this.executeAction(action);
          processedActions.push(action.id);
          
          AnalyticsManager.trackEvent('action_processed', {
            type: action.type,
            retryCount: action.retryCount,
          });
        } catch (error) {
          action.retryCount++;
          
          if (action.retryCount >= action.maxRetries) {
            processedActions.push(action.id);
            AnalyticsManager.trackError(error as Error, `Failed to process action: ${action.type}`);
          } else {
            AnalyticsManager.trackEvent('action_retry', {
              type: action.type,
              retryCount: action.retryCount,
            });
          }
        }
      }

      // Remove processed actions
      this.queue = this.queue.filter(action => !processedActions.includes(action.id));
      await this.saveQueue();

    } finally {
      this.isProcessing = false;
    }
  }

  // Execute a specific action
  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'send_message':
        await this.executeSendMessage(action.data);
        break;
      
      case 'create_post':
        await this.executeCreatePost(action.data);
        break;
      
      case 'add_reaction':
        await this.executeAddReaction(action.data);
        break;
      
      case 'update_profile':
        await this.executeUpdateProfile(action.data);
        break;
      
      case 'join_group':
        await this.executeJoinGroup(action.data);
        break;
      
      case 'follow_user':
        await this.executeFollowUser(action.data);
        break;
      
      case 'add_comment':
        await this.executeAddComment(action.data);
        break;
      
      case 'report_post':
        await this.executeReportPost(action.data);
        break;
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  // Execute send message action
  private async executeSendMessage(data: any): Promise<void> {
    const table = data.group_id ? 'group_messages' : 'direct_messages';
    const { error } = await supabase.from(table).insert(data);
    if (error) throw error;
  }

  // Execute create post action
  private async executeCreatePost(data: any): Promise<void> {
    const { error } = await supabase.from('posts').insert(data);
    if (error) throw error;
  }

  // Execute add reaction action
  private async executeAddReaction(data: any): Promise<void> {
    const { error } = await supabase.from('reactions').insert(data);
    if (error) throw error;
  }

  // Execute update profile action
  private async executeUpdateProfile(data: any): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(data.updates)
      .eq('id', data.userId);
    if (error) throw error;
  }

  // Execute join group action
  private async executeJoinGroup(data: any): Promise<void> {
    const { error } = await supabase.from('group_members').insert(data);
    if (error) throw error;
  }

  // Execute follow user action
  private async executeFollowUser(data: any): Promise<void> {
    const { error } = await supabase.from('follows').insert(data);
    if (error) throw error;
  }

  // Execute add comment action
  private async executeAddComment(data: any): Promise<void> {
    const { error } = await supabase.from('comments').insert(data);
    if (error) throw error;
  }

  // Execute report post action
  private async executeReportPost(data: any): Promise<void> {
    const { error } = await supabase.from('post_reports').insert(data);
    if (error) throw error;
  }

  // Check if online
  isOnline(): boolean {
    return this.networkState.isConnected && this.networkState.isInternetReachable;
  }

  // Get network state
  getNetworkState(): NetworkState {
    return { ...this.networkState };
  }

  // Add network state listener
  addNetworkListener(listener: (isOnline: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Get queue status
  getQueueStatus(): {
    count: number;
    processing: boolean;
    actions: { type: string; priority: string; retryCount: number }[];
  } {
    return {
      count: this.queue.length,
      processing: this.isProcessing,
      actions: this.queue.map(action => ({
        type: action.type,
        priority: action.priority,
        retryCount: action.retryCount,
      })),
    };
  }

  // Clear queue
  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.saveQueue();
  }

  // Save queue to storage
  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  // Load queue from storage
  private async loadQueue(): Promise<void> {
    try {
      const queueData = await AsyncStorage.getItem('offline_queue');
      if (queueData) {
        this.queue = JSON.parse(queueData);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  // Start queue processor
  private startQueueProcessor(): void {
    setInterval(() => {
      if (this.isOnline() && this.queue.length > 0) {
        this.processQueue();
      }
    }, 10000); // Check every 10 seconds
  }
}

// Utility functions for offline actions
export const OfflineActions = {
  sendMessage: (messageData: any, priority: 'high' | 'medium' | 'low' = 'high') => ({
    type: 'send_message',
    data: messageData,
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  createPost: (postData: any, priority: 'high' | 'medium' | 'low' = 'medium') => ({
    type: 'create_post',
    data: postData,
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  addReaction: (reactionData: any, priority: 'high' | 'medium' | 'low' = 'low') => ({
    type: 'add_reaction',
    data: reactionData,
    timestamp: Date.now(),
    maxRetries: 2,
    priority,
  }),

  updateProfile: (userId: string, updates: any, priority: 'high' | 'medium' | 'low' = 'medium') => ({
    type: 'update_profile',
    data: { userId, updates },
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  joinGroup: (groupData: any, priority: 'high' | 'medium' | 'low' = 'medium') => ({
    type: 'join_group',
    data: groupData,
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  followUser: (followerId: string, followeeId: string, priority: 'high' | 'medium' | 'low' = 'medium') => ({
    type: 'follow_user',
    data: { follower_id: followerId, followee_id: followeeId },
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  addComment: (commentData: any, priority: 'high' | 'medium' | 'low' = 'high') => ({
    type: 'add_comment',
    data: commentData,
    timestamp: Date.now(),
    maxRetries: 3,
    priority,
  }),

  reportPost: (reportData: any, priority: 'high' | 'medium' | 'low' = 'medium') => ({
    type: 'report_post',
    data: reportData,
    timestamp: Date.now(),
    maxRetries: 2,
    priority,
  }),
};