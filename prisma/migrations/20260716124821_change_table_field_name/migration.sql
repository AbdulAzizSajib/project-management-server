/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `workspace` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `workspace` DROP COLUMN `imageUrl`,
    ADD COLUMN `image` VARCHAR(191) NULL;
