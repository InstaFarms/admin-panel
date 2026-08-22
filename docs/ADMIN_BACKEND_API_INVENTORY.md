# Admin Backend API Inventory

Generated from admin code usage in `apps/admin` on 2026-04-09.

Notes:
- Paths use placeholders like `:id`, `:propertyId`.
- Query parts are shown as `?...` when dynamically built.
- This includes backend calls from actions/utils/components and internal admin route handlers consumed by UI.

## Auth
- `GET /api/auth/verify-admin`
- `POST /api/auth/send-otp`
- `POST /api/auth/verify-otp`

## Admin Role Permissions
- `GET /api/admin-role-permissions/matrix`
- `GET /api/admin-role-permissions/me`
- `POST /api/admin-role-permissions/sync-defaults`
- `PUT /api/admin-role-permissions/roles/:role`

## Admins and Users
- `POST /api/admins`
- `POST /api/admins/paginate`
- `POST /api/admins/search`
- `GET /api/admins/:id`
- `PATCH /api/admins/:id`
- `DELETE /api/admins/:id`
- `POST /api/users/admin`
- `POST /api/users/admin/paginate`
- `POST /api/users/admin/search`
- `POST /api/users/admin/search-by-role`
- `GET /api/users/admin/:id`
- `PATCH /api/users/admin/:id`
- `DELETE /api/users/admin/:id`

## Owner, Manager, Caretaker
- `POST /api/owners/admin/paginate`
- `GET /api/owners/:id`
- `GET /api/owners/:id/properties`
- `POST /api/managers/admin/paginate`
- `GET /api/managers/:id`
- `GET /api/managers/:id/properties`
- `POST /api/caretakers/admin/paginate`
- `GET /api/caretakers/:id`
- `GET /api/caretakers/:id/properties`
- `POST /api/properties/:propertyId/owners/assign`
- `DELETE /api/properties/:propertyId/owners/:ownerId`
- `POST /api/properties/:propertyId/managers/assign`
- `DELETE /api/properties/:propertyId/managers/:managerId`
- `POST /api/properties/:propertyId/caretakers/assign`
- `DELETE /api/properties/:propertyId/caretakers/:caretakerId`

## Properties
- `POST /api/properties`
- `GET /api/properties/:id`
- `PATCH /api/properties/:id`
- `DELETE /api/properties/:id`
- `POST /api/properties/admin/paginate`
- `POST /api/properties/admin/search`
- `POST /api/properties/admin/by-ids`
- `GET /api/properties/admin/:id/full`
- `POST /api/properties/admin/view-data`
- `POST /api/properties/advanced-search`
- `GET /api/properties/code/:code`
- `POST /api/properties/admin/split-mappings`
- `POST /api/properties/admin/create-split-property`
- `POST /api/properties/admin/split-mapping/by-child`
- `POST /api/properties/admin/update-split-property`
- `POST /api/properties/admin/merge-mappings`
- `POST /api/properties/admin/create-merged-property`
- `POST /api/properties/admin/delete-merged-property`
- `GET /api/properties/helpers/:endpoint`
- `GET /api/properties/helpers/areas-by-city/:cityId`
- `GET /api/properties/helpers/cities-by-state/:stateId`

## Property Gallery and Cover
- `GET /api/properties/:propertyId/gallery/all`
- `POST /api/properties/:propertyId/gallery/append`
- `PATCH /api/properties/:propertyId/gallery`
- `DELETE /api/properties/:propertyId/gallery/:photoId`
- `DELETE /api/properties/:propertyId/gallery/by-category/:category`
- `GET /api/properties/:propertyId/gallery/needs-watermark?limit=:limit`
- `GET /api/properties/gallery/needs-watermark-all?limit=:limit`
- `GET /api/properties/:propertyId/cover-photos`
- `PATCH /api/properties/:propertyId/cover-photos`
- `GET /api/properties/cover-photos/needs-conversion?limit=:limit`

## Amenities, Activities, Safety, Property Types
- `POST /api/amenities`
- `POST /api/amenities/paginate`
- `GET /api/amenities?type=amenities`
- `GET /api/amenities?type=activities`
- `GET /api/amenities/:id?type=amenities`
- `GET /api/amenities/:id?type=activities`
- `PATCH /api/amenities/:id`
- `PATCH /api/amenities/:id?type=activities`
- `DELETE /api/amenities/:id?type=amenities`
- `DELETE /api/amenities/:id?type=activities`
- `GET /api/amenities/info?type=activities`
- `POST /api/safety-hygiene`
- `POST /api/safety-hygiene/paginate`
- `GET /api/safety-hygiene`
- `GET /api/safety-hygiene/:id`
- `PATCH /api/safety-hygiene/:id`
- `DELETE /api/safety-hygiene/:id`
- `POST /api/property-types`
- `POST /api/property-types/paginate`
- `GET /api/property-types`
- `GET /api/property-types/:id`
- `PATCH /api/property-types/:id`
- `DELETE /api/property-types/:id`

## Areas, Cities, States, Landmarks, Brands
- `POST /api/areas`
- `POST /api/areas/paginate`
- `GET /api/areas`
- `GET /api/areas/:id`
- `PATCH /api/areas/:id`
- `DELETE /api/areas/:id`
- `GET /api/areas/:slug/nearby`
- `POST /api/areas/:areaId/brands`
- `POST /api/cities`
- `POST /api/cities/paginate`
- `GET /api/cities/:id`
- `PATCH /api/cities/:id`
- `DELETE /api/cities/:id`
- `POST /api/cities/:cityId/brands`
- `POST /api/states`
- `POST /api/states/paginate`
- `GET /api/states`
- `GET /api/states/:id`
- `PATCH /api/states/:id`
- `DELETE /api/states/:id`
- `POST /api/states/:stateId/brands`
- `POST /api/landmarks`
- `POST /api/landmarks/paginate`
- `GET /api/landmarks/id/:id`
- `PATCH /api/landmarks/id/:id`
- `DELETE /api/landmarks/id/:id`
- `GET /api/brands/all?...`

## Bookings, Refunds, Invoices, iCal
- `POST /api/booking/admin/create`
- `GET /api/booking/admin/availability/:propertyId`
- `PATCH /api/booking/admin/update/:bookingId`
- `POST /api/booking/admin/cancel/:bookingId`
- `POST /api/booking/admin/list`
- `POST /api/booking/admin/requests/list`
- `POST /api/booking/admin/blocking/list`
- `POST /api/booking/admin/blocking/create`
- `POST /api/booking/admin/archived`
- `POST /api/booking/admin/cancelled`
- `GET /api/booking/admin/:bookingId`
- `POST /api/booking/admin/download`
- `DELETE /api/booking/admin/delete/:bookingId`
- `POST /api/booking/updateRefundStatus/:bookingId`
- `POST /api/booking/admin/confirmations/approve/:id`
- `POST /api/booking/admin/confirmations/reject/:id`
- `GET /api/booking/admin/confirmations/pending/count`
- `POST /api/booking/admin/confirmations/pending`
- `GET /api/ical/admin/imported-bookings?...`
- `GET /api/ical/links/:propertyId`
- `POST /api/ical/links`
- `POST /api/ical/sync/:linkId`
- `DELETE /api/ical/links/:linkId`
- `GET /api/ical/admin/connection-status`
- `GET /api/ical/export/:propertyId`
- `GET /api/invoices/admin/:bookingId/pdf`
- `GET /bookings/adminCancelBooking/:bookingId`
- `POST /bookings/retryRefund/:bookingId`
- `POST /bookings/markManualRefund/:bookingId`
- `GET /bookings/refundStatus/:bookingId`

## Customers, Proposals, Enquiries, Coupons
- `POST /api/customers`
- `POST /api/customers/get_otp`
- `POST /api/customers/validate_otp_admin`
- `POST /api/customers/search`
- `POST /api/customers/paginate`
- `GET /api/customers?...`
- `GET /api/customers/:id?...`
- `PATCH /api/customers/:id?...`
- `DELETE /api/customers/:id?...`
- `POST /api/proposals?...`
- `GET /api/proposals?...`
- `GET /api/proposals/:id?...`
- `PATCH /api/proposals/:proposalId/items?...`
- `PATCH /api/proposals/:id?...`
- `DELETE /api/proposals/:id?...`
- `POST /api/enquiries/admin/paginate`
- `POST /api/enquiries/management/paginate`
- `POST /api/enquiries/management/status`
- `POST /api/enquiries/management/delete`
- `POST /api/coupons/create`
- `POST /api/coupons/update`
- `POST /api/coupons/delete`
- `POST /api/coupons/toggle-status`
- `POST /api/coupons/check-code`
- `POST /api/coupons/paginate`
- `GET /api/coupons/:id`

## Plans, Collections, CMS, Tags, Carousel, Static Images, FAQs
- `POST /api/discount-plans/global/create`
- `POST /api/discount-plans/global/update`
- `POST /api/discount-plans/global/delete`
- `POST /api/discount-plans/paginate`
- `GET /api/discount-plans/:id`
- `POST /api/cancellation-plans`
- `POST /api/cancellation-plans/paginate`
- `GET /api/cancellation-plans/:id`
- `PATCH /api/cancellation-plans/:id`
- `DELETE /api/cancellation-plans/:id`
- `POST /api/collections`
- `POST /api/collections/paginate`
- `GET /api/collections/:id`
- `PATCH /api/collections/:id`
- `DELETE /api/collections/:id`
- `POST /api/cms`
- `POST /api/cms/paginate`
- `GET /api/cms/:id`
- `PATCH /api/cms/:id`
- `DELETE /api/cms/:id`
- `POST /api/tags`
- `POST /api/tags/paginate`
- `GET /api/tags/:id`
- `PATCH /api/tags/:id`
- `DELETE /api/tags/:id`
- `POST /api/carousel`
- `POST /api/carousel/paginate`
- `GET /api/carousel/:id`
- `PATCH /api/carousel/:id`
- `DELETE /api/carousel/:id`
- `DELETE /api/carousel/:carouselId/image`
- `POST /api/static-images`
- `GET /api/static-images`
- `GET /api/static-images/:id`
- `PATCH /api/static-images/:id`
- `DELETE /api/static-images/:id`
- `GET /api/static-images/max-sort-order/:section`
- `GET /api/static-images/section/:section?activeOnly=:bool`
- `GET /api/static-images/section/homepage_hero?activeOnly=true`
- `POST /api/faqs/management/create`
- `POST /api/faqs/management/update`
- `POST /api/faqs/management/delete`
- `POST /api/faqs/management/paginate`
- `GET /api/faqs/management/:id`

## Dashboard, Reports, History, Notifications, Webhooks, Bulk, Supervisor, Wallet
- `GET /api/dashboard/bookings?...`
- `GET /api/dashboard/gbv?...`
- `GET /api/dashboard/weekly-abv?...`
- `POST /api/reports/ca`
- `POST /api/reports/ca/summary`
- `GET /api/history/paginate?...`
- `GET /api/history/:id`
- `POST /api/notifications/templates/paginate`
- `POST /api/notifications/event-types`
- `GET /api/notifications/templates/enums`
- `POST /api/notifications/templates`
- `GET /api/notifications/templates/:id`
- `PATCH /api/notifications/templates/:id`
- `POST /api/notifications/delivery-log/paginate`
- `POST /api/notifications/event-log/paginate`
- `POST /api/notifications/dead-letter-queue/paginate`
- `GET /api/webhooks/razorpay/logs?...`
- `POST /api/bulk/preview`
- `POST /api/bulk/execute`
- `GET /api/bulk?...`
- `DELETE /api/bulk/:id`
- `POST /api/bulk/permanent-execute`
- `GET /api/bulk/permanent-logs?...`
- `POST /api/bulk/permanent-revert/:id`
- `GET /api/supervisors`
- `POST /api/supervisors`
- `PATCH /api/supervisors/:id`
- `DELETE /api/supervisors/:id`
- `GET /api/supervisor-audits/list...`
- `GET /api/supervisor-audits/:auditId/report`
- `PATCH /api/supervisor-audits/tickets/:ticketId/priority`
- `PATCH /api/supervisor-audits/tickets/:ticketId/reassign`
- `POST /api/supervisor-audits/tickets/:ticketId/resolve`
- `POST /api/wallet/transaction`
- `POST /api/wallet/withdrawal-request/retry`
- `POST /api/wallet/settlements/block`
- `POST /api/wallet/settlements/unblock`
- `POST /api/wallet/settlements/settle-manual`
- `POST /api/wallet/:ownerId/toggle-settlement`
- `GET /api/wallet/:ownerId/balance`
- `GET /api/wallet/:ownerId/transactions?...`
- `GET /api/wallet/withdrawal-requests/failed?...`
- `GET /api/wallet/withdrawal-requests/pending?...`
- `GET /api/wallet/settlements/failed?...`
- `GET /api/wallet/settlements/blocked?...`
- `GET /api/wallet/settlements/upcoming?...`

## Internal Admin API Routes Used by UI
- `GET /api/proxy-image?url=...`
- `GET /api/google/place-details?...`
- `GET /api/analytics/traffic`
