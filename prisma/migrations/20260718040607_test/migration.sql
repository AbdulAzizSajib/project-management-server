-- AlterTable
ALTER TABLE `project_member` ADD COLUMN `role` ENUM('LEAD', 'MEMBER') NOT NULL DEFAULT 'MEMBER';
