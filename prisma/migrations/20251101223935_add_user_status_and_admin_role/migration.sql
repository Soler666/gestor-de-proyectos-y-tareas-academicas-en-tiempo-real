-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "username" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ALUMNO',
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "profileComplete" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "password" TEXT NOT NULL,
    "googleId" TEXT,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" DATETIME,
    "calendarId" TEXT
);
INSERT INTO "new_User" ("calendarId", "email", "firstName", "googleAccessToken", "googleId", "googleRefreshToken", "googleTokenExpiry", "id", "lastName", "password", "profileComplete", "role", "username") SELECT "calendarId", "email", "firstName", "googleAccessToken", "googleId", "googleRefreshToken", "googleTokenExpiry", "id", "lastName", "password", "profileComplete", "role", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
