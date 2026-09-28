-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `contact_number` VARCHAR(50) NULL,
    `role` ENUM('USER', 'PROVIDER', 'ADMIN') NOT NULL DEFAULT 'USER',
    `status` ENUM('ACTIVE', 'SUSPENDED', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `email_verified` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    INDEX `users_email_idx`(`email`),
    INDEX `users_role_status_idx`(`role`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `full_name` VARCHAR(150) NOT NULL,
    `date_of_birth` DATE NULL,
    `contact_number` VARCHAR(50) NULL,
    `profile_picture_url` VARCHAR(500) NULL,
    `user_type` ENUM('STUDENT', 'EXTERNAL') NULL,
    `university` VARCHAR(150) NULL,
    `faculty` VARCHAR(150) NULL,
    `university_email` VARCHAR(191) NULL,
    `university_id_number` VARCHAR(100) NULL,
    `nic_number` VARCHAR(100) NULL,
    `is_completed` BOOLEAN NOT NULL DEFAULT false,
    `privacy_settings` JSON NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_profiles_user_id_key`(`user_id`),
    INDEX `user_profiles_user_id_idx`(`user_id`),
    INDEX `user_profiles_user_type_idx`(`user_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `provider_profiles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider_type` ENUM('STUDENT_PROVIDER', 'EXTERNAL_PROVIDER') NOT NULL,
    `display_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `verification_status` ENUM('PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `verification_doc_url` VARCHAR(500) NULL,
    `rejection_reason` TEXT NULL,
    `overall_rating` DECIMAL(3, 2) NOT NULL DEFAULT 0.00,
    `total_reviews` INTEGER NOT NULL DEFAULT 0,
    `verified_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `provider_profiles_user_id_key`(`user_id`),
    INDEX `provider_profiles_user_id_idx`(`user_id`),
    INDEX `provider_profiles_verification_status_idx`(`verification_status`),
    INDEX `provider_profiles_provider_type_idx`(`provider_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `type` ENUM('MARKETPLACE', 'RENTAL') NOT NULL,
    `description` VARCHAR(255) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `categories_slug_key`(`slug`),
    INDEX `categories_type_is_active_idx`(`type`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marketplace_products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `condition` ENUM('NEW', 'LIKE_NEW', 'GOOD', 'FAIR') NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `location` VARCHAR(200) NOT NULL,
    `status` ENUM('AVAILABLE', 'SOLD', 'DEACTIVATED') NOT NULL DEFAULT 'AVAILABLE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `marketplace_products_provider_id_idx`(`provider_id`),
    INDEX `marketplace_products_category_id_idx`(`category_id`),
    INDEX `marketplace_products_status_idx`(`status`),
    INDEX `marketplace_products_price_idx`(`price`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `product_images_product_id_idx`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_listings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `provider_id` INTEGER NOT NULL,
    `category_id` INTEGER NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT NOT NULL,
    `condition` VARCHAR(100) NOT NULL,
    `rental_price` DECIMAL(10, 2) NOT NULL,
    `rental_period` ENUM('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY') NOT NULL DEFAULT 'DAILY',
    `item_type` ENUM('VEHICLE', 'EQUIPMENT', 'OTHER') NOT NULL,
    `status` ENUM('ACTIVE', 'INACTIVE', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `rental_listings_provider_id_idx`(`provider_id`),
    INDEX `rental_listings_category_id_idx`(`category_id`),
    INDEX `rental_listings_item_type_status_idx`(`item_type`, `status`),
    INDEX `rental_listings_rental_price_idx`(`rental_price`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_listing_images` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rental_listing_id` INTEGER NOT NULL,
    `image_url` VARCHAR(500) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rental_listing_images_rental_listing_id_idx`(`rental_listing_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_assets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rental_listing_id` INTEGER NOT NULL,
    `asset_identifier` VARCHAR(100) NOT NULL,
    `status` ENUM('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED') NOT NULL DEFAULT 'AVAILABLE',
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `rental_assets_rental_listing_id_idx`(`rental_listing_id`),
    INDEX `rental_assets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_vehicle_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rental_listing_id` INTEGER NOT NULL,
    `vehicle_type` ENUM('MOTORCYCLE', 'CAR', 'THREE_WHEELER', 'BICYCLE') NOT NULL,
    `make_model` VARCHAR(150) NOT NULL,
    `specifications` TEXT NULL,
    `pickup_location_name` VARCHAR(255) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,

    UNIQUE INDEX `rental_vehicle_details_rental_listing_id_key`(`rental_listing_id`),
    INDEX `rental_vehicle_details_rental_listing_id_idx`(`rental_listing_id`),
    INDEX `rental_vehicle_details_vehicle_type_idx`(`vehicle_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_equipment_details` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `rental_listing_id` INTEGER NOT NULL,
    `equipment_type` ENUM('CAMPING', 'SPORTS', 'EVENT', 'ACADEMIC', 'OTHER') NOT NULL,
    `specifications` TEXT NULL,
    `pickup_location_name` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `rental_equipment_details_rental_listing_id_key`(`rental_listing_id`),
    INDEX `rental_equipment_details_rental_listing_id_idx`(`rental_listing_id`),
    INDEX `rental_equipment_details_equipment_type_idx`(`equipment_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rental_bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `booking_number` VARCHAR(50) NOT NULL,
    `user_id` INTEGER NOT NULL,
    `rental_listing_id` INTEGER NOT NULL,
    `rental_asset_id` INTEGER NULL,
    `start_date` DATETIME(3) NOT NULL,
    `end_date` DATETIME(3) NOT NULL,
    `total_price` DECIMAL(10, 2) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `cancellation_reason` TEXT NULL,
    `user_details_pdf_url` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `rental_bookings_booking_number_key`(`booking_number`),
    INDEX `rental_bookings_user_id_idx`(`user_id`),
    INDEX `rental_bookings_rental_listing_id_idx`(`rental_listing_id`),
    INDEX `rental_bookings_rental_asset_id_idx`(`rental_asset_id`),
    INDEX `rental_bookings_status_idx`(`status`),
    INDEX `rental_bookings_start_date_end_date_idx`(`start_date`, `end_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `conversations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `participant_one_id` INTEGER NOT NULL,
    `participant_two_id` INTEGER NOT NULL,
    `item_type` ENUM('MARKETPLACE', 'RENTAL') NULL,
    `item_id` INTEGER NULL,
    `last_message_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `conversations_participant_one_id_idx`(`participant_one_id`),
    INDEX `conversations_participant_two_id_idx`(`participant_two_id`),
    INDEX `conversations_last_message_at_idx`(`last_message_at`),
    UNIQUE INDEX `conversations_participant_one_id_participant_two_id_item_typ_key`(`participant_one_id`, `participant_two_id`, `item_type`, `item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `conversation_id` INTEGER NOT NULL,
    `sender_id` INTEGER NOT NULL,
    `receiver_id` INTEGER NOT NULL,
    `message_content` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `read_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `messages_conversation_id_idx`(`conversation_id`),
    INDEX `messages_sender_id_idx`(`sender_id`),
    INDEX `messages_receiver_id_idx`(`receiver_id`),
    INDEX `messages_is_read_idx`(`is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `user_id` INTEGER NOT NULL,
    `provider_id` INTEGER NOT NULL,
    `transaction_type` ENUM('MARKETPLACE', 'RENTAL') NOT NULL,
    `transaction_id` INTEGER NOT NULL,
    `rating` TINYINT NOT NULL,
    `comment` TEXT NULL,
    `status` ENUM('PUBLISHED', 'HIDDEN', 'REMOVED') NOT NULL DEFAULT 'PUBLISHED',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `reviews_provider_id_idx`(`provider_id`),
    INDEX `reviews_user_id_idx`(`user_id`),
    INDEX `reviews_status_idx`(`status`),
    UNIQUE INDEX `reviews_user_id_transaction_type_transaction_id_key`(`user_id`, `transaction_type`, `transaction_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `reporter_id` INTEGER NOT NULL,
    `reported_user_id` INTEGER NULL,
    `entity_type` ENUM('USER', 'PROVIDER', 'MARKETPLACE_LISTING', 'RENTAL_LISTING', 'MESSAGE', 'REVIEW') NOT NULL,
    `entity_id` INTEGER NOT NULL,
    `reason_type` ENUM('FRAUD', 'INAPPROPRIATE', 'MISLEADING', 'OTHER') NOT NULL,
    `description` TEXT NOT NULL,
    `status` ENUM('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED') NOT NULL DEFAULT 'PENDING',
    `admin_notes` TEXT NULL,
    `resolved_by_admin_id` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `resolved_at` DATETIME(3) NULL,

    INDEX `reports_reporter_id_idx`(`reporter_id`),
    INDEX `reports_reported_user_id_idx`(`reported_user_id`),
    INDEX `reports_status_idx`(`status`),
    INDEX `reports_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `recipient_id` INTEGER NOT NULL,
    `type` ENUM('BOOKING_REQUEST', 'BOOKING_UPDATE', 'NEW_MESSAGE', 'VERIFICATION_UPDATE', 'SYSTEM') NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT NOT NULL,
    `reference_type` VARCHAR(100) NULL,
    `reference_id` INTEGER NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_recipient_id_idx`(`recipient_id`),
    INDEX `notifications_is_read_idx`(`is_read`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `provider_profiles` ADD CONSTRAINT `provider_profiles_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_products` ADD CONSTRAINT `marketplace_products_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `provider_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marketplace_products` ADD CONSTRAINT `marketplace_products_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `marketplace_products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_listings` ADD CONSTRAINT `rental_listings_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `provider_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_listings` ADD CONSTRAINT `rental_listings_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_listing_images` ADD CONSTRAINT `rental_listing_images_rental_listing_id_fkey` FOREIGN KEY (`rental_listing_id`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_assets` ADD CONSTRAINT `rental_assets_rental_listing_id_fkey` FOREIGN KEY (`rental_listing_id`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_vehicle_details` ADD CONSTRAINT `rental_vehicle_details_rental_listing_id_fkey` FOREIGN KEY (`rental_listing_id`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_equipment_details` ADD CONSTRAINT `rental_equipment_details_rental_listing_id_fkey` FOREIGN KEY (`rental_listing_id`) REFERENCES `rental_listings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_rental_listing_id_fkey` FOREIGN KEY (`rental_listing_id`) REFERENCES `rental_listings`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rental_bookings` ADD CONSTRAINT `rental_bookings_rental_asset_id_fkey` FOREIGN KEY (`rental_asset_id`) REFERENCES `rental_assets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_participant_one_id_fkey` FOREIGN KEY (`participant_one_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `conversations` ADD CONSTRAINT `conversations_participant_two_id_fkey` FOREIGN KEY (`participant_two_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_conversation_id_fkey` FOREIGN KEY (`conversation_id`) REFERENCES `conversations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_fkey` FOREIGN KEY (`receiver_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_provider_id_fkey` FOREIGN KEY (`provider_id`) REFERENCES `provider_profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reporter_id_fkey` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_reported_user_id_fkey` FOREIGN KEY (`reported_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_resolved_by_admin_id_fkey` FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
