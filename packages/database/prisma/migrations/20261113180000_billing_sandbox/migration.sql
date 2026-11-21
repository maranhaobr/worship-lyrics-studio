CREATE TABLE "ChurchSubscription" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "churchId" TEXT NOT NULL REFERENCES "Church"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "environment" TEXT NOT NULL, "planId" TEXT NOT NULL, "cycle" TEXT NOT NULL,
 "priceCents" INTEGER NOT NULL, "policyVersion" TEXT NOT NULL, "billingType" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'CREATING', "customerId" TEXT, "providerId" TEXT, "invoiceUrl" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "ChurchSubscription_churchId_environment_key" ON "ChurchSubscription"("churchId", "environment");
CREATE UNIQUE INDEX "ChurchSubscription_providerId_key" ON "ChurchSubscription"("providerId");
CREATE TABLE "BillingInvoice" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "subscriptionId" TEXT NOT NULL REFERENCES "ChurchSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 "status" TEXT NOT NULL, "dueDate" TEXT NOT NULL, "priceCents" INTEGER NOT NULL, "invoiceUrl" TEXT,
 "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "BillingInvoice_subscriptionId_dueDate_idx" ON "BillingInvoice"("subscriptionId", "dueDate");
CREATE TABLE "BillingEvent" (
 "id" TEXT NOT NULL PRIMARY KEY, "environment" TEXT NOT NULL,
 "eventType" TEXT NOT NULL, "resourceId" TEXT NOT NULL,
 "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
