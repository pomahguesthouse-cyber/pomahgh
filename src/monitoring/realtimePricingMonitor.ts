// Real-time pricing performance monitoring and alerting system
// Tracks system performance, pricing accuracy, and business metrics

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface PerformanceMetrics {
  pricing_calculations_per_second: number;
  average_calculation_time_ms: number;
  cache_hit_rate: number;
  error_rate: number;
  queue_size: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
}

interface BusinessMetrics {
  total_rooms: number;
  rooms_with_auto_pricing: number;
  average_price_change_percentage: number;
  price_updates_per_hour: number;
  approval_rate: number;
  revenue_impact_estimate: number;
}

interface AlertConfig {
  metric_name: string;
  threshold: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldown_minutes: number;
  enabled: boolean;
}

interface Alert {
  id: string;
  metric_name: string;
  current_value: number;
  threshold: number;
  severity: string;
  message: string;
  triggered_at: string;
  resolved_at?: string;
  is_active: boolean;
}

export class RealTimePricingMonitor {
  private supabase: any;
  private metrics: Map<string, number> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertConfigs: AlertConfig[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initializeAlertConfigs();
  }

  // Initialize alert configurations
  private initializeAlertConfigs(): void {
    this.alertConfigs = [
      // Performance alerts
      {
        metric_name: 'average_calculation_time_ms',
        threshold: 1000,
        operator: '>',
        severity: 'high',
        cooldown_minutes: 5,
        enabled: true
      },
      {
        metric_name: 'cache_hit_rate',
        threshold: 80,
        operator: '<',
        severity: 'medium',
        cooldown_minutes: 10,
        enabled: true
      },
      {
        metric_name: 'error_rate',
        threshold: 5,
        operator: '>',
        severity: 'high',
        cooldown_minutes: 5,
        enabled: true
      },
      {
        metric_name: 'queue_size',
        threshold: 100,
        operator: '>',
        severity: 'medium',
        cooldown_minutes: 3,
        enabled: true
      },
      
      // Business alerts
      {
        metric_name: 'price_updates_per_hour',
        threshold: 50,
        operator: '>',
        severity: 'medium',
        cooldown_minutes: 15,
        enabled: true
      },
      {
        metric_name: 'approval_rate',
        threshold: 20,
        operator: '>',
        severity: 'high',
        cooldown_minutes: 10,
        enabled: true
      },
      
      // System alerts
      {
        metric_name: 'memory_usage_mb',
        threshold: 1024,
        operator: '>',
        severity: 'critical',
        cooldown_minutes: 2,
        enabled: true
      },
      {
        metric_name: 'cpu_usage_percent',
        threshold: 80,
        operator: '>',
        severity: 'high',
        cooldown_minutes: 5,
        enabled: true
      }
    ];
  }

  // Collect performance metrics
  async collectPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      const startTime = Date.now();

      // Get pricing calculation metrics
      const { data: calcMetrics } = await this.supabase
        .from('pricing_calculations')
        .select('processing_time_ms, created_at')
        .gte('created_at', new Date(Date.now() - 60000).toISOString()) // Last minute
        .eq('status', 'completed');

      // Get queue size
      const { data: queueData } = await this.supabase
        .from('pricing_events')
        .select('id')
        .eq('processed', false);

      // Get error rate
      const { data: errorData } = await this.supabase
        .from('pricing_calculations')
        .select('id')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 60000).toISOString());

      // Calculate metrics
      const calculationsPerSecond = calcMetrics?.length || 0;
      const averageCalculationTime = calcMetrics?.length > 0 
        ? calcMetrics.reduce((sum, calc) => sum + (calc.processing_time_ms || 0), 0) / calcMetrics.length 
        : 0;
      const queueSize = queueData?.length || 0;
      const errorRate = calculationsPerSecond > 0 ? (errorData?.length || 0) / calculationsPerSecond * 100 : 0;

      // Get cache metrics (would integrate with Redis)
      const cacheHitRate = await this.getCacheHitRate();

      // Get system metrics
      const memoryUsage = await this.getMemoryUsage();
      const cpuUsage = await this.getCpuUsage();

      const metrics: PerformanceMetrics = {
        pricing_calculations_per_second: calculationsPerSecond,
        average_calculation_time_ms: averageCalculationTime,
        cache_hit_rate: cacheHitRate,
        error_rate: errorRate,
        queue_size: queueSize,
        memory_usage_mb: memoryUsage,
        cpu_usage_percent: cpuUsage
      };

      // Store metrics
      await this.storeMetrics('performance', metrics);

      // Check alerts
      await this.checkAlerts(metrics);

      return metrics;

    } catch (error) {
      console.error('Error collecting performance metrics:', error);
      throw error;
    }
  }

  // Collect business metrics
  async collectBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      // Get room counts
      const { data: roomCounts } = await this.supabase
        .from('rooms')
        .select('id, auto_pricing_enabled');

      const totalRooms = roomCounts?.length || 0;
      const roomsWithAutoPricing = roomCounts?.filter(r => r.auto_pricing_enabled).length || 0;

      // Get price change metrics
      const { data: priceChanges } = await this.supabase
        .from('pricing_adjustment_logs')
        .select('previous_price, new_price, created_at')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

      const averagePriceChangePercentage = priceChanges?.length > 0
        ? priceChanges.reduce((sum, change) => {
            const percentage = Math.abs((change.new_price - change.previous_price) / change.previous_price * 100);
            return sum + percentage;
          }, 0) / priceChanges.length
        : 0;

      const priceUpdatesPerHour = priceChanges?.length || 0;

      // Get approval metrics
      const { data: approvalData } = await this.supabase
        .from('price_approvals')
        .select('status')
        .gte('created_at', new Date(Date.now() - 3600000).toISOString());

      const totalApprovals = approvalData?.length || 0;
      const pendingApprovals = approvalData?.filter(a => a.status === 'pending').length || 0;
      const approvalRate = totalApprovals > 0 ? (pendingApprovals / totalApprovals) * 100 : 0;

      // Estimate revenue impact
      const revenueImpactEstimate = await this.calculateRevenueImpact(priceChanges);

      const metrics: BusinessMetrics = {
        total_rooms: totalRooms,
        rooms_with_auto_pricing: roomsWithAutoPricing,
        average_price_change_percentage: averagePriceChangePercentage,
        price_updates_per_hour: priceUpdatesPerHour,
        approval_rate: approvalRate,
        revenue_impact_estimate: revenueImpactEstimate
      };

      // Store metrics
      await this.storeMetrics('business', metrics);

      return metrics;

    } catch (error) {
      console.error('Error collecting business metrics:', error);
      throw error;
    }
  }

  // Store metrics in database
  private async storeMetrics(type: string, metrics: any): Promise<void> {
    try {
      const metricRecords = Object.entries(metrics).map(([name, value]) => ({
        metric_type: type,
        metric_name: name,
        metric_value: Number(value),
        recorded_at: new Date().toISOString()
      }));

      if (metricRecords.length > 0) {
        await this.supabase
          .from('pricing_metrics')
          .insert(metricRecords);
      }
    } catch (error) {
      console.error('Error storing metrics:', error);
    }
  }

  // Check alerts against thresholds
  private async checkAlerts(metrics: any): Promise<void> {
    for (const config of this.alertConfigs) {
      if (!config.enabled) continue;

      const currentValue = metrics[config.metric_name];
      if (currentValue === undefined) continue;

      const threshold = config.threshold;
      let triggered = false;

      switch (config.operator) {
        case '>':
          triggered = currentValue > threshold;
          break;
        case '<':
          triggered = currentValue < threshold;
          break;
        case '>=':
          triggered = currentValue >= threshold;
          break;
        case '<=':
          triggered = currentValue <= threshold;
          break;
        case '=':
          triggered = currentValue === threshold;
          break;
      }

      if (triggered) {
        await this.triggerAlert(config, currentValue);
      } else {
        await this.resolveAlert(config.metric_name);
      }
    }
  }

  // Trigger alert
  private async triggerAlert(config: AlertConfig, currentValue: number): Promise<void> {
    const alertKey = config.metric_name;
    const now = Date.now();
    const lastAlertTime = this.lastAlertTimes.get(alertKey) || 0;

    // Check cooldown
    const cooldownMs = config.cooldown_minutes * 60 * 1000;
    if (now - lastAlertTime < cooldownMs) {
      return;
    }

    // Create alert
    const alert: Alert = {
      id: crypto.randomUUID(),
      metric_name: config.metric_name,
      current_value: currentValue,
      threshold: config.threshold,
      severity: config.severity,
      message: this.buildAlertMessage(config, currentValue),
      triggered_at: new Date().toISOString(),
      is_active: true
    };

    // Store alert
    this.alerts.set(alertKey, alert);
    this.lastAlertTimes.set(alertKey, now);

    // Save to database
    await this.supabase
      .from('pricing_alerts')
      .insert({
        metric_name: alert.metric_name,
        current_value: alert.current_value,
        threshold: alert.threshold,
        severity: alert.severity,
        message: alert.message,
        triggered_at: alert.triggered_at,
        is_active: true
      });

    // Send notification
    await this.sendAlertNotification(alert);

    console.log(`🚨 Alert triggered: ${alert.message}`);
  }

  // Resolve alert
  private async resolveAlert(metricName: string): Promise<void> {
    const alert = this.alerts.get(metricName);
    if (!alert || !alert.is_active) return;

    alert.is_active = false;
    alert.resolved_at = new Date().toISOString();

    // Update database
    await this.supabase
      .from('pricing_alerts')
      .update({ is_active: false, resolved_at: alert.resolved_at })
      .eq('metric_name', metricName)
      .eq('is_active', true);

    console.log(`✅ Alert resolved: ${metricName}`);
  }

  // Build alert message
  private buildAlertMessage(config: AlertConfig, currentValue: number): string {
    const operatorSymbol = config.operator;
    return `${config.metric_name} ${operatorSymbol} ${config.threshold} (current: ${currentValue.toFixed(2)})`;
  }

  // Send alert notification
  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // Get hotel settings
      const { data: settings } = await this.supabase
        .from('hotel_settings')
        .select('whatsapp_number, hotel_name')
        .single();

      if (!settings?.whatsapp_number) {
        console.log('No WhatsApp number configured for alerts');
        return;
      }

      // Build alert message
      const severityEmoji = {
        low: '🟡',
        medium: '🟠',
        high: '🔴',
        critical: '🚨'
      };

      const message = `${severityEmoji[alert.severity]} *PRICING ALERT*

📍 ${settings.hotel_name || 'Hotel'}
📊 Metric: ${alert.metric_name}
⚠️ Alert: ${alert.message}
🕐 Triggered: ${new Date(alert.triggered_at).toLocaleString('id-ID')}

Severity: ${alert.severity.toUpperCase()}

Please check the pricing system immediately.`;

      // Send WhatsApp
      await this.supabase.functions.invoke('send-whatsapp', {
        body: {
          phone: settings.whatsapp_number,
          message: message,
          type: 'admin'
        }
      });

    } catch (error) {
      console.error('Error sending alert notification:', error);
    }
  }

  // Get cache hit rate (would integrate with Redis)
  private async getCacheHitRate(): Promise<number> {
    // This would integrate with your Redis cache
    // For now, return a mock value
    return 85.5;
  }

  // Get memory usage
  private async getMemoryUsage(): Promise<number> {
    // This would get actual memory usage from your monitoring system
    // For now, return a mock value
    return 512;
  }

  // Get CPU usage
  private async getCpuUsage(): Promise<number> {
    // This would get actual CPU usage from your monitoring system
    // For now, return a mock value
    return 45.2;
  }

  // Calculate revenue impact
  private async calculateRevenueImpact(priceChanges: any[]): Promise<number> {
    // This would calculate the actual revenue impact
    // For now, return a mock value
    return priceChanges?.length * 1000 || 0;
  }

  // Get system health status
  async getSystemHealth(): Promise<any> {
    try {
      const performanceMetrics = await this.collectPerformanceMetrics();
      const businessMetrics = await this.collectBusinessMetrics();
      const activeAlerts = Array.from(this.alerts.values()).filter(a => a.is_active);

      // Calculate health score (0-100)
      let healthScore = 100;
      
      // Deduct points for active alerts
      activeAlerts.forEach(alert => {
        switch (alert.severity) {
          case 'critical':
            healthScore -= 25;
            break;
          case 'high':
            healthScore -= 15;
            break;
          case 'medium':
            healthScore -= 10;
            break;
          case 'low':
            healthScore -= 5;
            break;
        }
      });

      // Deduct points for high error rate
      if (performanceMetrics.error_rate > 5) {
        healthScore -= 20;
      }

      // Deduct points for low cache hit rate
      if (performanceMetrics.cache_hit_rate < 70) {
        healthScore -= 15;
      }

      healthScore = Math.max(0, healthScore);

      return {
        health_score: healthScore,
        status: healthScore >= 80 ? 'healthy' : healthScore >= 60 ? 'warning' : 'critical',
        performance_metrics: performanceMetrics,
        business_metrics: businessMetrics,
        active_alerts: activeAlerts,
        last_updated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        health_score: 0,
        status: 'error',
        error: error.message,
        last_updated: new Date().toISOString()
      };
    }
  }

  // Get metrics history
  async getMetricsHistory(metricName: string, hours: number = 24): Promise<any[]> {
    try {
      const fromTime = new Date(Date.now() - hours * 3600000).toISOString();

      const { data } = await this.supabase
        .from('pricing_metrics')
        .select('*')
        .eq('metric_name', metricName)
        .gte('recorded_at', fromTime)
        .order('recorded_at', { ascending: true });

      return data || [];

    } catch (error) {
      console.error('Error getting metrics history:', error);
      return [];
    }
  }
}

// Export singleton instance
export let pricingMonitor: RealTimePricingMonitor;

export function initializePricingMonitor(supabaseUrl: string, supabaseKey: string): RealTimePricingMonitor {
  pricingMonitor = new RealTimePricingMonitor(supabaseUrl, supabaseKey);
  return pricingMonitor;
}