-- AlterTable
ALTER TABLE `account` MODIFY `accessToken` TEXT NULL,
    MODIFY `refreshToken` TEXT NULL,
    MODIFY `idToken` TEXT NULL;

-- AlterTable
ALTER TABLE `verification` MODIFY `value` TEXT NOT NULL;
