
import 'dotenv/config';
import prisma from '../lib/prisma';

async function deleteTaskCompletion(userId: string, taskId: string) {
  if (!userId || !taskId) {
    console.error("❌ Error: Please provide both a userId and a taskId.");
    console.log("   Usage: npx tsx scripts/delete-task-completion.ts <userId> <taskId>");
    return;
  }

  console.log("🔍 Attempting to delete task completion for...");
  console.log(`   User ID: ${userId}`);
  console.log(`   Task ID: ${taskId}`);

  try {
    const result = await prisma.userTaskCompletion.deleteMany({
      where: {
        userId: userId,
        taskId: taskId,
      },
    });

    if (result.count > 0) {
      console.log(`\n✅ Success! Deleted ${result.count} task completion record(s).`);
    } else {
      console.log(`\n🟡 Warning: No matching task completion record was found to delete.`);
      console.log(`   Please check if the userId and taskId are correct.`);
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("\n❌ An unexpected error occurred:", message);
    if (message.includes("foreign key constraint")) {
        console.error("   Hint: This error should not happen on this table, but it indicates a database integrity issue.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Get arguments from command line
const args = process.argv.slice(2);
const [userId, taskId] = args;

deleteTaskCompletion(userId, taskId);
