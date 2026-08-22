"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformRawAreaToArea = exports.DateState = exports.paymentModeOptions = exports.paymentTypeOptions = exports.transactionTypeOptions = exports.bookingTypeOptions = exports.cancellationTypeOptions = exports.refundStatusOptions = exports.genderOptions = exports.webhookStatusOptions = exports.roleOptions = void 0;
exports.roleOptions = ["Owner", "Manager", "Caretaker"];
exports.webhookStatusOptions = ["PENDING", "PROCESSED"];
exports.genderOptions = ["Male", "Female", "Other"]; // Added "Other"
exports.refundStatusOptions = ["Pending", "Completed", "Failed"];
exports.cancellationTypeOptions = ["Online", "Offline"];
exports.bookingTypeOptions = ["Online", "Offline"];
exports.transactionTypeOptions = ["Credit", "Debit"];
exports.paymentTypeOptions = ["Security Deposit", "Rent"];
exports.paymentModeOptions = ["Cash", "Online"];
var DateState;
(function (DateState) {
    DateState["IDLE"] = "IDLE";
    DateState["BOOKED"] = "BOOKED";
    DateState["BLOCKED"] = "BLOCKED";
    DateState["HIDDEN"] = "HIDDEN";
    DateState["LOADING"] = "LOADING";
})(DateState || (exports.DateState = DateState = {}));
var transformRawAreaToArea = function (rawData) { return ({
    id: rawData.areas.id,
    area: rawData.areas.area,
    icon: rawData.areas.icon,
    cityId: rawData.areas.cityId,
    stateId: rawData.areas.stateId,
    adminCreatedBy: rawData.areas.adminCreatedBy,
    adminUpdatedBy: rawData.areas.adminUpdatedBy,
    weight: rawData.areas.weight,
    featured: rawData.areas.featured,
    slug: rawData.areas.slug,
    faqs: rawData.areas.faqs,
    meta: rawData.areas.meta,
    areaInfo: rawData.areas.areaInfo,
    city: rawData.cities ? {
        id: rawData.cities.id,
        city: rawData.cities.city,
    } : null,
    state: rawData.states ? {
        id: rawData.states.id,
        state: rawData.states.state,
    } : null,
}); };
exports.transformRawAreaToArea = transformRawAreaToArea;
