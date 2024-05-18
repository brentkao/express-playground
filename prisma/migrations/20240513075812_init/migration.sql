-- CreateTable
CREATE TABLE `account` (
    `uid` CHAR(26) NOT NULL,
    `email` VARCHAR(45) NOT NULL,
    `salt` VARCHAR(255) NOT NULL,
    `hash` VARCHAR(255) NOT NULL,
    `first_name` VARCHAR(45) NULL,
    `last_name` VARCHAR(45) NULL,
    `country` VARCHAR(45) NULL,
    `country_code` VARCHAR(5) NULL,
    `phone_number` VARCHAR(20) NULL,
    `birth_date` DATE NULL,
    `create_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `update_at` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uid_UNIQUE`(`uid`),
    UNIQUE INDEX `email_UNIQUE`(`email`),
    PRIMARY KEY (`uid`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
