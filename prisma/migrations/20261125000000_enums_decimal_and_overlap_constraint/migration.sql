CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE "Role" AS ENUM ('member', 'admin');
CREATE TYPE "SpaceType" AS ENUM ('desk', 'private_room', 'suite');
CREATE TYPE "BookingStatus" AS ENUM ('pending', 'confirmed', 'canceled');
CREATE TYPE "Plan" AS ENUM ('basic', 'pro', 'enterprise');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role" USING "role"::"Role";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'member';

ALTER TABLE "Space" ALTER COLUMN "type" TYPE "SpaceType" USING "type"::"SpaceType";
ALTER TABLE "Space" ALTER COLUMN "pricePerHour" TYPE DECIMAL(10,2);
ALTER TABLE "Space" ADD COLUMN "location" TEXT NOT NULL DEFAULT 'Sin asignar';
ALTER TABLE "Space" ALTER COLUMN "location" DROP DEFAULT;

ALTER TABLE "Booking" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Booking" ALTER COLUMN "status" TYPE "BookingStatus" USING "status"::"BookingStatus";
ALTER TABLE "Booking" ALTER COLUMN "status" SET DEFAULT 'confirmed';
ALTER TABLE "Booking" ALTER COLUMN "totalPrice" TYPE DECIMAL(10,2) USING ROUND("totalPrice"::numeric, 2);

ALTER TABLE "Membership" ALTER COLUMN "plan" DROP DEFAULT;
ALTER TABLE "Membership" ALTER COLUMN "plan" TYPE "Plan" USING "plan"::"Plan";
ALTER TABLE "Membership" ALTER COLUMN "plan" SET DEFAULT 'basic';

ALTER TABLE "Membership" DROP CONSTRAINT "Membership_userId_fkey";
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Booking_spaceId_startTime_endTime_idx" ON "Booking"("spaceId", "startTime", "endTime");

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT "id", "spaceId", "startTime", "endTime" FROM "Booking" WHERE "status" <> 'canceled' ORDER BY "id" LOOP
        IF EXISTS (
            SELECT 1 FROM "Booking" o
            WHERE o."spaceId" = r."spaceId"
            AND o."status" <> 'canceled'
            AND o."id" < r."id"
            AND o."startTime" < r."endTime"
            AND o."endTime" > r."startTime"
        ) THEN
            UPDATE "Booking" SET "status" = 'canceled' WHERE "id" = r."id";
        END IF;
    END LOOP;
END $$;

ALTER TABLE "Booking" ADD CONSTRAINT "Booking_no_overlap"
EXCLUDE USING gist (
    "spaceId" WITH =,
    tsrange("startTime", "endTime") WITH &&
) WHERE ("status" <> 'canceled');
