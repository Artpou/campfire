import "./env";
import { db } from "./db";
import { user } from "./schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Create users
    console.log("👤 Creating users...");
    const [user1] = await db
      .insert(user)
      .values({
        id: "seed_user_1",
        email: "[email protected]",
        emailVerified: false,
        username: "johndoe",
        displayUsername: "johndoe",
        name: "johndoe",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log(`✅ Created user: ${user1.username} (${user1.id})`);

    console.log("✨ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
