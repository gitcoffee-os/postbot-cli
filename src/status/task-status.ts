import chalk from 'chalk';
import ora from 'ora';
import { appName, createApiClient } from '../config.js';
import { WorkflowApi } from '@gitcoffee/postbot-sdk';

export async function taskStatus(opts: {
  taskId?: string;
  app?: 'postbot' | 'postar';
  json?: boolean;
}) {
  const appKey = appName(opts.app);

  if (!opts.taskId) {
    console.log(chalk.red('Task ID is required'));
    process.exit(1);
  }

  const spinner = ora('Querying status...').start();

  try {
    const client = createApiClient(appKey);
    const workflowApi = new WorkflowApi(client);
    const result = await workflowApi.executeWorkflow('STATUS_QUERY', {
      taskId: Number(opts.taskId),
    });

    spinner.stop();

    if (opts.json) {
      console.log(JSON.stringify(result.result, null, 2));
      return;
    }

    console.log(chalk.bold('\nTask Status:'));
    console.log(chalk.gray('─'.repeat(60)));

    if (result.result?.task) {
      const task = result.result.task as Record<string, any>;
      console.log(`  Task ID:        ${chalk.cyan(task.id)}`);
      console.log(`  Name:           ${chalk.cyan(task.name)}`);
      console.log(`  Type:           ${chalk.cyan(task.type)}`);
      console.log(`  Status:         ${chalk.yellow(task.status)}`);
      if (task.failureReason) {
        console.log(`  Failure Reason: ${chalk.red(task.failureReason)}`);
      }
      console.log(`  Channel:        ${chalk.cyan(task.publishChannel || 'N/A')}`);
      console.log(`  Scheduled At:   ${chalk.cyan(task.scheduledAt || 'N/A')}`);
      if (task.publishedUrl) {
        console.log(`  Published URL:  ${chalk.cyan(task.publishedUrl)}`);
      }
      if (task.contentUrl) {
        console.log(`  Content URL:    ${chalk.cyan(task.contentUrl)}`);
      }
      if (task.executionResult) {
        console.log(`  Execution:      ${chalk.red(task.executionResult)}`);
      }
    }

    if (result.result?.latestJob) {
      const job = result.result.latestJob as Record<string, any>;
      console.log(chalk.bold('\n  Latest Publish Job:'));
      console.log(`    Job ID:         ${chalk.cyan(job.id)}`);
      console.log(`    Status:         ${chalk.yellow(job.status)}`);
      if (job.failureReason) {
        console.log(`    Failure Reason: ${chalk.red(job.failureReason)}`);
      }
      console.log(`    Scheduled:      ${chalk.cyan(job.scheduledAt || 'N/A')}`);
      console.log(`    Executed:       ${chalk.cyan(job.executedAt || 'N/A')}`);
      console.log(`    Retries:        ${job.retryCount}`);
      if (job.fullLog) {
        const preview = String(job.fullLog).slice(-1200).trim();
        console.log(chalk.gray(`    Full Log Preview (last 1200 chars):`));
        for (const line of preview.split('\n').slice(-30)) {
          console.log(chalk.gray(`      ${line.slice(-140)}`));
        }
      }
    }

    if (result.result?.recentLogs && Array.isArray(result.result.recentLogs) && result.result.recentLogs.length > 0) {
      console.log(chalk.bold('\n  Recent Logs:'));
      for (const log of result.result.recentLogs) {
        const logEntry = log as Record<string, any>;
        const statusIcon = logEntry.status === 'SUCCESS' ? chalk.green('✓') : chalk.red('✗');
        const detail = logEntry.contentUrl || logEntry.publishedUrl || logEntry.errorMsg || logEntry.failureReason || 'N/A';
        console.log(`    ${statusIcon} ${logEntry.status} - ${detail}`);
        if (logEntry.failureReason && !logEntry.errorMsg?.includes(logEntry.failureReason)) {
          console.log(`      Failure Reason: ${chalk.red(logEntry.failureReason)}`);
        }
        if (logEntry.pageSnapshotHtml) {
          const size = String(logEntry.pageSnapshotHtml).length;
          console.log(`      HTML Snapshot: ${chalk.yellow(`${Math.round(size / 1024)}KB`)}`);
        }
        if (logEntry.screenshotUrl) {
          console.log(`      Screenshot: ${chalk.gray(logEntry.screenshotUrl)}`);
        }
        if (logEntry.fullLog) {
          const preview = String(logEntry.fullLog).slice(-800).trim();
          if (preview) {
            console.log(chalk.gray(`      Log Preview (last 800 chars):`));
            for (const line of preview.split('\n').slice(-20)) {
              console.log(chalk.gray(`        ${line.slice(-120)}`));
            }
          }
        }
      }

      const latestLog = result.result.recentLogs[0] as Record<string, any>;
      const sessionId = latestLog.sessionbotSessionId && latestLog.sessionbotSessionId !== 0
        ? String(latestLog.sessionbotSessionId)
        : 'N/A';
      const proxyId = latestLog.proxybotProfileId && latestLog.proxybotProfileId !== 0
        ? String(latestLog.proxybotProfileId)
        : 'N/A';
      const proxyAddr = latestLog.proxyHost
        ? `${latestLog.proxyHost}${latestLog.proxyPort ? ':' + latestLog.proxyPort : ''}`
        : 'N/A';
      console.log(chalk.bold('\n  Runtime Context:'));
      console.log(`    Session: ${chalk.cyan(sessionId)} (cookies: ${latestLog.cookieCount ?? 'N/A'})`);
      console.log(`    Proxy:   ${chalk.cyan(proxyId)} (${chalk.gray(proxyAddr)})`);
      if (latestLog.hasSnapshot) {
        console.log(`    ${chalk.yellow('Snapshot available for failed task reproduction')}`);
      }

      if (latestLog.steps?.length) {
        console.log(chalk.bold('\n  Execution Steps:'));
        const stepsByStage = new Map<string, Array<Record<string, any>>>();
        for (const step of latestLog.steps as Array<Record<string, any>>) {
          const stage = step.stage || 'OTHER';
          if (!stepsByStage.has(stage)) {
            stepsByStage.set(stage, []);
          }
          stepsByStage.get(stage)!.push(step);
        }
        const stageOrder = ['PREPARE', 'NAVIGATE', 'PUBLISH', 'VERIFY'];
        const sortedStages = Array.from(stepsByStage.keys()).sort((a, b) => {
          const indexA = stageOrder.indexOf(a);
          const indexB = stageOrder.indexOf(b);
          if (indexA === -1 && indexB === -1) return a.localeCompare(b);
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        });
        for (const stage of sortedStages) {
          console.log(`    ${chalk.bold(stage)}`);
          for (const step of stepsByStage.get(stage)!) {
            const icon = step.status === 'SUCCESS' ? chalk.green('✓')
              : step.status === 'FAILED' ? chalk.red('✗')
              : chalk.gray('-');
            const duration = step.durationMs ? `${step.durationMs}ms` : '';
            const reason = step.failureReason ? ` [${chalk.red(step.failureReason)}]` : '';
            console.log(`      ${icon} ${String(step.name).padEnd(20)} ${chalk.gray(duration)}${reason}`);
          }
        }
      }
    }

    console.log(chalk.gray('─'.repeat(60)));
  } catch (error: any) {
    spinner.fail(chalk.red(`Failed to query status: ${error.message}`));
    process.exit(1);
  }
}
