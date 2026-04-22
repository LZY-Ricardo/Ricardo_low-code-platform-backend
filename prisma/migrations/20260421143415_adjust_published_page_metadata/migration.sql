-- DropIndex
DROP INDEX "published_pages_publish_url_key";

-- AlterTable
ALTER TABLE "published_pages" ADD COLUMN     "description" VARCHAR(500),
ADD COLUMN     "title" VARCHAR(255);
