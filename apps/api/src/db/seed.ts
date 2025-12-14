import "./env";
import { db } from "./db";
import { users } from "./schema";

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    // Create users
    console.log("👤 Creating users...");
    const [user1] = await db
      .insert(users)
      .values({
        id: "seed_user_1",
        email: "john.doe@acme.com",
        name: "John Doe",
      })
      .returning();

    console.log(`✅ Created user: ${user1.email} (${user1.id})`);

    console.log("✨ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    process.exit(0);
  }
}

seed();
