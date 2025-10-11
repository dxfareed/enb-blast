
import 'dotenv/config';
import prisma from '../lib/prisma';

async function deleteTask(taskId: string) {
  if (!taskId) {
    console.error("❌ Error: Please provide a taskId.");
    console.log("   Usage: npx tsx scripts/delete-task.ts <taskId>");
    return;
  }

  console.log("🚨 WARNING: This is a destructive action.");
  console.log("   You are about to permanently delete a task and all its associated user completions.");
  console.log(`   Task ID: ${taskId}`);

  // Simple countdown to prevent accidental execution
  console.log("\nProceeding in 3 seconds...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("Proceeding in 2 seconds...");
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log("Proceeding in 1 second...");
  await new Promise(resolve => setTimeout(resolve, 1000));

  try {
    // Use a transaction to ensure both operations succeed or neither do.
    const [completionsResult, taskResult] = await prisma.$transaction([
      // 1. Delete all UserTaskCompletion records linked to this task.
      prisma.userTaskCompletion.deleteMany({
        where: {
          taskId: taskId,
        },
      }),
      // 2. Delete the Task itself.
      prisma.task.delete({
        where: {
          id: taskId,
        },
      }),
    ]);

    console.log(`\n✅ Success!`);
    console.log(`   - Deleted ${completionsResult.count} user completion record(s).`);
    console.log(`   - Deleted task: ${taskResult.title}`);

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ An error occurred during the deletion process:", message);
    if (message.includes("Record to delete does not exist")) {
        console.error(`   Hint: A task with the ID "${taskId}" was not found.`);
    } else {
        console.error("   The database transaction was rolled back. No data was changed.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
const [taskId] = args;

deleteTask(taskId);
