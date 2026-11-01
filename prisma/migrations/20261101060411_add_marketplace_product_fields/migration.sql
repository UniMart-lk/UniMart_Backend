-- DropIndex
DROP INDEX `reports_resolved_by_admin_id_fkey` ON `reports`;

-- AlterTable
ALTER TABLE `marketplace_products` ADD COLUMN `allow_negotiation` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `details` JSON NULL,
    ADD COLUMN `inquiries_count` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `location_details` JSON NULL,
    ADD COLUMN `reviews` JSON NULL,
    ADD COLUMN `views_count` INTEGER NOT NULL DEFAULT 0,
    MODIFY `condition` ENUM('NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'USED') NOT NULL;

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
