"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniqueStringFilter = uniqueStringFilter;
exports.parseFilterParams = parseFilterParams;
exports.parseLimitOffset = parseLimitOffset;
exports.parseString = parseString;
exports.parseBoolean = parseBoolean;
exports.parseNumber = parseNumber;
exports.validateDateStr = validateDateStr;
exports.validateTimeStr = validateTimeStr;
exports.validatePropertyData = validatePropertyData;
exports.parseSpecialDates = parseSpecialDates;
exports.parseAdminFormData = parseAdminFormData;
exports.parsePropertyFormData = parsePropertyFormData;
exports.parseUserFormData = parseUserFormData;
exports.parseCancellationFormData = parseCancellationFormData;
exports.parsePaymentFormData = parsePaymentFormData;
exports.parseBankFormData = parseBankFormData;
exports.parseBookingFormData = parseBookingFormData;
exports.parseCustomerFormData = parseCustomerFormData;
exports.parseOwnerFormData = parseOwnerFormData;
var schema_1 = require("@repo/db/schema");
var luxon_1 = require("luxon");
require("server-only");
var uuid_1 = require("uuid");
var types_1 = require("./types");
function uniqueStringFilter(data) {
    var set = new Set();
    var res = [];
    data.forEach(function (str) {
        if (!set.has(str)) {
            set.add(str);
            res.push(str);
        }
    });
    return res;
}
function parseFilterParams(searchParams) {
    var searchKey = searchParams.searchKey, searchValue = searchParams.searchValue;
    if (typeof searchKey === "string" &&
        typeof searchValue === "string" &&
        searchKey.length > 0 &&
        searchValue.length > 0) {
        return { searchKey: searchKey, searchValue: searchValue };
    }
    return null;
}
function parseLimitOffset(searchParams) {
    var page = searchParams.page, itemsPerPage = searchParams.itemsPerPage;
    var limit = 10;
    var offset = 0;
    if (itemsPerPage) {
        var itemsPerPageNum = Number(itemsPerPage);
        if (!Number.isNaN(itemsPerPageNum)) {
            limit = Math.min(100, itemsPerPageNum);
        }
    }
    if (page) {
        var pageNum = Number(page);
        if (!Number.isNaN(pageNum)) {
            offset = Math.max(0, limit * (pageNum - 1));
        }
    }
    return { limit: limit, offset: offset };
}
function parseString(str) {
    if (str === undefined || str.length === 0) {
        return null;
    }
    return str;
}
function parseBoolean(str) {
    if ((str === null || str === void 0 ? void 0 : str.toLowerCase()) === "true")
        return true;
    return false;
}
function parseNumber(str) {
    if (str === undefined || str === null) {
        return null;
    }
    // Handle empty strings
    var trimmed = str.trim();
    if (trimmed === "") {
        return null;
    }
    // Remove common problematic characters (backticks, quotes, etc.) that might be accidentally included
    // Keep only digits, decimal points, negative signs, and scientific notation characters
    var sanitized = trimmed.replace(/[`'"]/g, '').trim();
    // If after sanitization it's empty, return null
    if (sanitized === "") {
        return null;
    }
    var num = Number(sanitized);
    if (Number.isNaN(num)) {
        throw new Error("Invalid Value: \"".concat(str, "\" cannot be converted to a number"));
    }
    return num;
}
function validateDateStr(dateStr) {
    if (!dateStr)
        return null;
    var dt = luxon_1.DateTime.fromSQL(dateStr);
    if (dt.isValid) {
        return dateStr;
    }
    return null;
}
function validateTimeStr(timeStr) {
    if (!timeStr)
        return null;
    var time = luxon_1.DateTime.fromSQL(timeStr);
    if (time.isValid) {
        return timeStr;
    }
    return null;
}
function validatePropertyData(data) {
    // Checks
    if (!data.propertyName || data.propertyName.length === 0) {
        return "Invalid Property Name.";
    }
    if (data.amenities) {
        var uniqueAmenityTitles = uniqueStringFilter(data.amenities.map(function (x) { return x.id; }));
        if (uniqueAmenityTitles.length !== data.amenities.length) {
            return "Repeated amenities are not allowed.";
        }
    }
    if (data.activities) {
        var uniqueActivityTitles = uniqueStringFilter(data.activities.map(function (x) { return x.id; }));
        if (uniqueActivityTitles.length !== data.activities.length) {
            return "Repeated activities are not allowed.";
        }
    }
    return null;
}
function parseSpecialDates(formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    // First, try to parse from JSON string (preferred method)
    var specialDatesJson = (_a = formData.get("specialDates")) === null || _a === void 0 ? void 0 : _a.toString();
    if (specialDatesJson) {
        try {
            var parsed = JSON.parse(specialDatesJson);
            // Validate dates are unique
            var seen_1 = new Set();
            for (var _i = 0, parsed_1 = parsed; _i < parsed_1.length; _i++) {
                var sd = parsed_1[_i];
                if (seen_1.has(sd.date)) {
                    return { error: "Repeated dates are not allowed." };
                }
                seen_1.add(sd.date);
            }
            return { data: parsed };
        }
        catch (error) {
            console.error("Error parsing specialDates JSON:", error);
            // Fall through to individual field parsing
        }
    }
    // Fallback: Parse from individual form fields
    var seen = new Set();
    function isUniqueString(str) {
        if (seen.has(str)) {
            return null; // Found a repeated string
        }
        else {
            seen.add(str);
            return str; // New string
        }
    }
    var res = [];
    for (var _r = 0, _s = formData.keys(); _r < _s.length; _r++) {
        var key = _s[_r];
        if (key.startsWith("special-date-")) {
            var uuid = key.substring(13);
            var dateStr = (_b = formData.get("special-date-".concat(uuid))) === null || _b === void 0 ? void 0 : _b.toString();
            if (!dateStr) {
                return { error: "Invalid date." };
            }
            var uniqueString = isUniqueString(dateStr);
            if (!uniqueString) {
                return { error: "Repeated dates are not allowed." };
            }
            var data = {
                id: (0, uuid_1.v4)(),
                date: dateStr,
                price: parseNumber((_c = formData.get("special-price-".concat(uuid))) === null || _c === void 0 ? void 0 : _c.toString()),
                priceWithGST: parseNumber((_d = formData.get("special-priceWithGST-".concat(uuid))) === null || _d === void 0 ? void 0 : _d.toString()),
                adultExtraGuestCharge: parseNumber((_e = formData.get("special-adultExtraGuestCharge-".concat(uuid))) === null || _e === void 0 ? void 0 : _e.toString()),
                adultExtraGuestChargeWithGST: parseNumber((_f = formData.get("special-adultExtraGuestChargeWithGST-".concat(uuid))) === null || _f === void 0 ? void 0 : _f.toString()),
                childExtraGuestCharge: parseNumber((_g = formData.get("special-childExtraGuestCharge-".concat(uuid))) === null || _g === void 0 ? void 0 : _g.toString()),
                childExtraGuestChargeWithGST: parseNumber((_h = formData.get("special-childExtraGuestChargeWithGST-".concat(uuid))) === null || _h === void 0 ? void 0 : _h.toString()),
                infantExtraGuestCharge: parseNumber((_j = formData.get("special-infantExtraGuestCharge-".concat(uuid))) === null || _j === void 0 ? void 0 : _j.toString()),
                infantExtraGuestChargeWithGST: parseNumber((_k = formData.get("special-infantExtraGuestChargeWithGST-".concat(uuid))) === null || _k === void 0 ? void 0 : _k.toString()),
                baseGuestCount: parseNumber((_l = formData.get("special-baseGuestCount-".concat(uuid))) === null || _l === void 0 ? void 0 : _l.toString()),
                discount: parseNumber((_m = formData.get("special-discount-".concat(uuid))) === null || _m === void 0 ? void 0 : _m.toString()),
                maxExtraGuestPrice: parseNumber((_o = formData.get("special-maxExtraGuestPrice-".concat(uuid))) === null || _o === void 0 ? void 0 : _o.toString()),
                maxTotal: parseNumber((_p = formData.get("special-maxTotal-".concat(uuid))) === null || _p === void 0 ? void 0 : _p.toString()),
                gstSlab: parseNumber((_q = formData.get("special-gstSlab-".concat(uuid))) === null || _q === void 0 ? void 0 : _q.toString()),
            };
            res.push(data);
        }
    }
    console.log(JSON.stringify(res));
    return { data: res };
}
function parseAdminFormData(formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    var firstName = parseString((_a = formData.get("firstName")) === null || _a === void 0 ? void 0 : _a.toString());
    var email = parseString((_b = formData.get("email")) === null || _b === void 0 ? void 0 : _b.toString());
    var phoneNumber = parseString((_c = formData.get("phoneNumber")) === null || _c === void 0 ? void 0 : _c.toString());
    if (firstName === null) {
        throw new Error("Please enter admin first name.");
    }
    if (email === null) {
        throw new Error("Please enter admin email.");
    }
    if (phoneNumber === null) {
        throw new Error("Please enter admin phone number.");
    }
    return {
        id: (0, uuid_1.v4)(),
        firstName: firstName,
        lastName: parseString((_d = formData.get("lastName")) === null || _d === void 0 ? void 0 : _d.toString()),
        email: email,
        phoneNumber: phoneNumber,
        gender: parseString((_e = formData.get("gender")) === null || _e === void 0 ? void 0 : _e.toString()),
        whatsappNumber: parseString((_f = formData.get("whatsappNumber")) === null || _f === void 0 ? void 0 : _f.toString()),
        alternateContact: parseString((_g = formData.get("alternateContact")) === null || _g === void 0 ? void 0 : _g.toString()),
        addressDetails: formData.get("addressDetails") ?
            JSON.parse(((_h = formData.get("addressDetails")) === null || _h === void 0 ? void 0 : _h.toString()) || "{}") : {},
        loginAt: parseString((_j = formData.get("loginAt")) === null || _j === void 0 ? void 0 : _j.toString()),
        logoutAt: parseString((_k = formData.get("logoutAt")) === null || _k === void 0 ? void 0 : _k.toString()),
    };
}
function parsePropertyFormData(formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101, _102, _103, _104, _105, _106, _107, _108, _109, _110, _111, _112, _113, _114, _115, _116, _117, _118, _119, _120, _121, _122, _123, _124, _125, _126, _127, _128, _129, _130, _131, _132, _133, _134, _135, _136, _137, _138, _139, _140, _141, _142, _143, _144, _145, _146, _147, _148, _149, _150, _151, _152, _153, _154, _155, _156, _157, _158, _159, _160, _161, _162, _163, _164, _165, _166, _167, _168, _169, _170, _171, _172, _173, _174, _175, _176, _177, _178, _179, _180, _181, _182, _183, _184, _185, _186, _187, _188, _189, _190, _191, _192, _193, _194, _195, _196, _197, _198, _199, _200, _201, _202, _203, _204, _205, _206, _207, _208, _209, _210, _211, _212, _213, _214, _215, _216, _217, _218, _219, _220, _221, _222, _223, _224, _225, _226, _227, _228, _229, _230, _231, _232, _233, _234, _235, _236, _237, _238, _239, _240, _241, _242, _243, _244, _245, _246, _247, _248, _249, _250, _251, _252, _253, _254, _255, _256, _257, _258, _259, _260, _261, _262, _263, _264, _265, _266, _267, _268, _269, _270, _271, _272, _273, _274, _275, _276, _277, _278, _279, _280, _281, _282, _283, _284, _285, _286, _287, _288, _289, _290, _291, _292, _293, _294, _295, _296, _297, _298, _299, _300, _301, _302, _303, _304, _305, _306, _307, _308, _309, _310, _311, _312, _313, _314, _315, _316, _317, _318, _319, _320, _321, _322, _323, _324, _325, _326, _327, _328, _329, _330, _331, _332, _333, _334, _335, _336, _337, _338, _339;
    var propertyName = parseString((_a = formData.get("propertyName")) === null || _a === void 0 ? void 0 : _a.toString());
    var propertyCode = parseString((_b = formData.get("propertyCode")) === null || _b === void 0 ? void 0 : _b.toString());
    if (!propertyName) {
        throw new Error("Enter Property name.");
    }
    if (!propertyCode) {
        throw new Error("Enter Property code.");
    }
    var amenitiesIds = [];
    var activitiesIds = [];
    for (var _i = 0, _340 = formData.keys(); _i < _340.length; _i++) {
        var key = _340[_i];
        if (key.startsWith("amenity-title-")) {
            amenitiesIds.push(key.substring(14));
        }
        else if (key.startsWith("activity-title-")) {
            activitiesIds.push(key.substring(15));
        }
    }
    // const amenities: AmenityData[] = uniqueStringFilter(amenitiesIds).map(
    //   (id) => {
    //     const title = parseString(
    //       formData.get(`amenity-title-${id}`)?.toString(),
    //     );
    //     const weight = parseNumber(
    //       formData.get(`amenity-weight-${id}`)?.toString(),
    //     );
    //     const isPaid = parseBoolean(
    //       formData.get(`amenity-isPaid-${id}`)?.toString(),
    //     );
    //     const isUSP = parseBoolean(
    //       formData.get(`amenity-isUSP-${id}`)?.toString(),
    //     );
    //     if (!title || title.length === 0) {
    //       throw new Error("Invalid Amenity name.");
    //     }
    //     return { id: v4(), amenity: title, weight, isPaid, isUSP };
    //   },
    // );
    // const activities: ActivityData[] = uniqueStringFilter(activitiesIds).map(
    //   (id) => {
    //     const title = parseString(
    //       formData.get(`activity-title-${id}`)?.toString(),
    //     );
    //     const weight = parseNumber(
    //       formData.get(`activity-weight-${id}`)?.toString(),
    //     );
    //     const isPaid = parseBoolean(
    //       formData.get(`activity-isPaid-${id}`)?.toString(),
    //     );
    //     const isUSP = parseBoolean(
    //       formData.get(`activity-isUSP-${id}`)?.toString(),
    //     );
    //     if (!title || title.length === 0) {
    //       throw new Error("Invalid Activity name.");
    //     }
    //     return { id: v4(), activity: title, weight, isPaid, isUSP };
    //   },
    // );
    return {
        // id: v4(),
        propertyName: propertyName,
        propertyCode: propertyCode,
        propertyCodeName: (_d = parseString((_c = formData.get("propertyCodeName")) === null || _c === void 0 ? void 0 : _c.toString())) !== null && _d !== void 0 ? _d : null,
        description: (_f = parseString((_e = formData.get("description")) === null || _e === void 0 ? void 0 : _e.toString())) !== null && _f !== void 0 ? _f : "",
        homeRulesTruths: (function () {
            var _a, _b, _c;
            var raw = ((_a = formData.get("homeRulesTruths")) === null || _a === void 0 ? void 0 : _a.toString()) || ((_b = formData.get("homeRulesAndTruth")) === null || _b === void 0 ? void 0 : _b.toString());
            if (!raw)
                return null;
            try {
                var parsed = JSON.parse(raw);
                return typeof parsed === "object" && parsed !== null && "content" in parsed
                    ? { content: String((_c = parsed.content) !== null && _c !== void 0 ? _c : "") }
                    : { content: String(parsed) };
            }
            catch (_d) {
                return { content: raw };
            }
        })(),
        baseGuestCount: (_k = parseNumber((_j = formData.get("baseGuestCount")) === null || _j === void 0 ? void 0 : _j.toString())) !== null && _k !== void 0 ? _k : null,
        maxGuestCount: (_m = parseNumber((_l = formData.get("maxGuestCount")) === null || _l === void 0 ? void 0 : _l.toString())) !== null && _m !== void 0 ? _m : null,
        mondayPrice: (_p = parseNumber((_o = formData.get("mondayPrice")) === null || _o === void 0 ? void 0 : _o.toString())) !== null && _p !== void 0 ? _p : null,
        mondayPriceWithGST: (_r = parseNumber((_q = formData.get("mondayPriceWithGST")) === null || _q === void 0 ? void 0 : _q.toString())) !== null && _r !== void 0 ? _r : null,
        mondayAdultExtraGuestCharge: (_t = parseNumber((_s = formData.get("mondayAdultExtraGuestCharge")) === null || _s === void 0 ? void 0 : _s.toString())) !== null && _t !== void 0 ? _t : null,
        mondayAdultExtraGuestChargeWithGST: (_v = parseNumber((_u = formData.get("mondayAdultExtraGuestChargeWithGST")) === null || _u === void 0 ? void 0 : _u.toString())) !== null && _v !== void 0 ? _v : null,
        mondayChildExtraGuestCharge: (_x = parseNumber((_w = formData.get("mondayChildExtraGuestCharge")) === null || _w === void 0 ? void 0 : _w.toString())) !== null && _x !== void 0 ? _x : null,
        mondayChildExtraGuestChargeWithGST: (_z = parseNumber((_y = formData.get("mondayChildExtraGuestChargeWithGST")) === null || _y === void 0 ? void 0 : _y.toString())) !== null && _z !== void 0 ? _z : null,
        mondayInfantExtraGuestCharge: (_1 = parseNumber((_0 = formData.get("mondayInfantExtraGuestCharge")) === null || _0 === void 0 ? void 0 : _0.toString())) !== null && _1 !== void 0 ? _1 : null,
        mondayInfantExtraGuestChargeWithGST: (_3 = parseNumber((_2 = formData.get("mondayInfantExtraGuestChargeWithGST")) === null || _2 === void 0 ? void 0 : _2.toString())) !== null && _3 !== void 0 ? _3 : null,
        mondayBaseGuestCount: (_5 = parseNumber((_4 = formData.get("mondayBaseGuestCount")) === null || _4 === void 0 ? void 0 : _4.toString())) !== null && _5 !== void 0 ? _5 : null,
        mondayDiscount: (_7 = parseNumber((_6 = formData.get("mondayDiscount")) === null || _6 === void 0 ? void 0 : _6.toString())) !== null && _7 !== void 0 ? _7 : null,
        mondayGSTslab: (_9 = parseNumber((_8 = formData.get("mondayGSTslab")) === null || _8 === void 0 ? void 0 : _8.toString())) !== null && _9 !== void 0 ? _9 : null,
        mondayMaxExtraGuestPrice: (_11 = parseNumber((_10 = formData.get("mondayMaxExtraGuestPrice")) === null || _10 === void 0 ? void 0 : _10.toString())) !== null && _11 !== void 0 ? _11 : null,
        mondayMaxTotal: (_13 = parseNumber((_12 = formData.get("mondayMaxTotal")) === null || _12 === void 0 ? void 0 : _12.toString())) !== null && _13 !== void 0 ? _13 : null,
        tuesdayPrice: (_15 = parseNumber((_14 = formData.get("tuesdayPrice")) === null || _14 === void 0 ? void 0 : _14.toString())) !== null && _15 !== void 0 ? _15 : null,
        tuesdayPriceWithGST: (_17 = parseNumber((_16 = formData.get("tuesdayPriceWithGST")) === null || _16 === void 0 ? void 0 : _16.toString())) !== null && _17 !== void 0 ? _17 : null,
        tuesdayAdultExtraGuestCharge: (_19 = parseNumber((_18 = formData.get("tuesdayAdultExtraGuestCharge")) === null || _18 === void 0 ? void 0 : _18.toString())) !== null && _19 !== void 0 ? _19 : null,
        tuesdayAdultExtraGuestChargeWithGST: (_21 = parseNumber((_20 = formData.get("tuesdayAdultExtraGuestChargeWithGST")) === null || _20 === void 0 ? void 0 : _20.toString())) !== null && _21 !== void 0 ? _21 : null,
        tuesdayChildExtraGuestCharge: (_23 = parseNumber((_22 = formData.get("tuesdayChildExtraGuestCharge")) === null || _22 === void 0 ? void 0 : _22.toString())) !== null && _23 !== void 0 ? _23 : null,
        tuesdayChildExtraGuestChargeWithGST: (_25 = parseNumber((_24 = formData.get("tuesdayChildExtraGuestChargeWithGST")) === null || _24 === void 0 ? void 0 : _24.toString())) !== null && _25 !== void 0 ? _25 : null,
        tuesdayInfantExtraGuestCharge: (_27 = parseNumber((_26 = formData.get("tuesdayInfantExtraGuestCharge")) === null || _26 === void 0 ? void 0 : _26.toString())) !== null && _27 !== void 0 ? _27 : null,
        tuesdayInfantExtraGuestChargeWithGST: (_29 = parseNumber((_28 = formData.get("tuesdayInfantExtraGuestChargeWithGST")) === null || _28 === void 0 ? void 0 : _28.toString())) !== null && _29 !== void 0 ? _29 : null,
        tuesdayBaseGuestCount: (_31 = parseNumber((_30 = formData.get("tuesdayBaseGuestCount")) === null || _30 === void 0 ? void 0 : _30.toString())) !== null && _31 !== void 0 ? _31 : null,
        tuesdayDiscount: (_33 = parseNumber((_32 = formData.get("tuesdayDiscount")) === null || _32 === void 0 ? void 0 : _32.toString())) !== null && _33 !== void 0 ? _33 : null,
        tuesdayGSTslab: (_35 = parseNumber((_34 = formData.get("tuesdayGSTslab")) === null || _34 === void 0 ? void 0 : _34.toString())) !== null && _35 !== void 0 ? _35 : null,
        tuesdayMaxExtraGuestPrice: (_37 = parseNumber((_36 = formData.get("tuesdayMaxExtraGuestPrice")) === null || _36 === void 0 ? void 0 : _36.toString())) !== null && _37 !== void 0 ? _37 : null,
        tuesdayMaxTotal: (_39 = parseNumber((_38 = formData.get("tuesdayMaxTotal")) === null || _38 === void 0 ? void 0 : _38.toString())) !== null && _39 !== void 0 ? _39 : null,
        wednesdayPrice: (_41 = parseNumber((_40 = formData.get("wednesdayPrice")) === null || _40 === void 0 ? void 0 : _40.toString())) !== null && _41 !== void 0 ? _41 : null,
        wednesdayPriceWithGST: (_43 = parseNumber((_42 = formData.get("wednesdayPriceWithGST")) === null || _42 === void 0 ? void 0 : _42.toString())) !== null && _43 !== void 0 ? _43 : null,
        wednesdayAdultExtraGuestCharge: (_45 = parseNumber((_44 = formData.get("wednesdayAdultExtraGuestCharge")) === null || _44 === void 0 ? void 0 : _44.toString())) !== null && _45 !== void 0 ? _45 : null,
        wednesdayAdultExtraGuestChargeWithGST: (_47 = parseNumber((_46 = formData.get("wednesdayAdultExtraGuestChargeWithGST")) === null || _46 === void 0 ? void 0 : _46.toString())) !== null && _47 !== void 0 ? _47 : null,
        wednesdayChildExtraGuestCharge: (_49 = parseNumber((_48 = formData.get("wednesdayChildExtraGuestCharge")) === null || _48 === void 0 ? void 0 : _48.toString())) !== null && _49 !== void 0 ? _49 : null,
        wednesdayChildExtraGuestChargeWithGST: (_51 = parseNumber((_50 = formData.get("wednesdayChildExtraGuestChargeWithGST")) === null || _50 === void 0 ? void 0 : _50.toString())) !== null && _51 !== void 0 ? _51 : null,
        wednesdayInfantExtraGuestCharge: (_53 = parseNumber((_52 = formData.get("wednesdayInfantExtraGuestCharge")) === null || _52 === void 0 ? void 0 : _52.toString())) !== null && _53 !== void 0 ? _53 : null,
        wednesdayInfantExtraGuestChargeWithGST: (_55 = parseNumber((_54 = formData.get("wednesdayInfantExtraGuestChargeWithGST")) === null || _54 === void 0 ? void 0 : _54.toString())) !== null && _55 !== void 0 ? _55 : null,
        wednesdayBaseGuestCount: (_57 = parseNumber((_56 = formData.get("wednesdayBaseGuestCount")) === null || _56 === void 0 ? void 0 : _56.toString())) !== null && _57 !== void 0 ? _57 : null,
        wednesdayDiscount: (_59 = parseNumber((_58 = formData.get("wednesdayDiscount")) === null || _58 === void 0 ? void 0 : _58.toString())) !== null && _59 !== void 0 ? _59 : null,
        wednesdayGSTslab: (_61 = parseNumber((_60 = formData.get("wednesdayGSTslab")) === null || _60 === void 0 ? void 0 : _60.toString())) !== null && _61 !== void 0 ? _61 : null,
        wednesdayMaxExtraGuestPrice: (_63 = parseNumber((_62 = formData.get("wednesdayMaxExtraGuestPrice")) === null || _62 === void 0 ? void 0 : _62.toString())) !== null && _63 !== void 0 ? _63 : null,
        wednesdayMaxTotal: (_65 = parseNumber((_64 = formData.get("wednesdayMaxTotal")) === null || _64 === void 0 ? void 0 : _64.toString())) !== null && _65 !== void 0 ? _65 : null,
        thursdayPrice: (_67 = parseNumber((_66 = formData.get("thursdayPrice")) === null || _66 === void 0 ? void 0 : _66.toString())) !== null && _67 !== void 0 ? _67 : null,
        thursdayPriceWithGST: (_69 = parseNumber((_68 = formData.get("thursdayPriceWithGST")) === null || _68 === void 0 ? void 0 : _68.toString())) !== null && _69 !== void 0 ? _69 : null,
        thursdayAdultExtraGuestCharge: (_71 = parseNumber((_70 = formData.get("thursdayAdultExtraGuestCharge")) === null || _70 === void 0 ? void 0 : _70.toString())) !== null && _71 !== void 0 ? _71 : null,
        thursdayAdultExtraGuestChargeWithGST: (_73 = parseNumber((_72 = formData.get("thursdayAdultExtraGuestChargeWithGST")) === null || _72 === void 0 ? void 0 : _72.toString())) !== null && _73 !== void 0 ? _73 : null,
        thursdayChildExtraGuestCharge: (_75 = parseNumber((_74 = formData.get("thursdayChildExtraGuestCharge")) === null || _74 === void 0 ? void 0 : _74.toString())) !== null && _75 !== void 0 ? _75 : null,
        thursdayChildExtraGuestChargeWithGST: (_77 = parseNumber((_76 = formData.get("thursdayChildExtraGuestChargeWithGST")) === null || _76 === void 0 ? void 0 : _76.toString())) !== null && _77 !== void 0 ? _77 : null,
        thursdayInfantExtraGuestCharge: (_79 = parseNumber((_78 = formData.get("thursdayInfantExtraGuestCharge")) === null || _78 === void 0 ? void 0 : _78.toString())) !== null && _79 !== void 0 ? _79 : null,
        thursdayInfantExtraGuestChargeWithGST: (_81 = parseNumber((_80 = formData.get("thursdayInfantExtraGuestChargeWithGST")) === null || _80 === void 0 ? void 0 : _80.toString())) !== null && _81 !== void 0 ? _81 : null,
        thursdayBaseGuestCount: (_83 = parseNumber((_82 = formData.get("thursdayBaseGuestCount")) === null || _82 === void 0 ? void 0 : _82.toString())) !== null && _83 !== void 0 ? _83 : null,
        thursdayDiscount: (_85 = parseNumber((_84 = formData.get("thursdayDiscount")) === null || _84 === void 0 ? void 0 : _84.toString())) !== null && _85 !== void 0 ? _85 : null,
        thursdayGSTslab: (_87 = parseNumber((_86 = formData.get("thursdayGSTslab")) === null || _86 === void 0 ? void 0 : _86.toString())) !== null && _87 !== void 0 ? _87 : null,
        thursdayMaxExtraGuestPrice: (_89 = parseNumber((_88 = formData.get("thursdayMaxExtraGuestPrice")) === null || _88 === void 0 ? void 0 : _88.toString())) !== null && _89 !== void 0 ? _89 : null,
        thursdayMaxTotal: (_91 = parseNumber((_90 = formData.get("thursdayMaxTotal")) === null || _90 === void 0 ? void 0 : _90.toString())) !== null && _91 !== void 0 ? _91 : null,
        fridayPrice: (_93 = parseNumber((_92 = formData.get("fridayPrice")) === null || _92 === void 0 ? void 0 : _92.toString())) !== null && _93 !== void 0 ? _93 : null,
        fridayPriceWithGST: (_95 = parseNumber((_94 = formData.get("fridayPriceWithGST")) === null || _94 === void 0 ? void 0 : _94.toString())) !== null && _95 !== void 0 ? _95 : null,
        fridayAdultExtraGuestCharge: (_97 = parseNumber((_96 = formData.get("fridayAdultExtraGuestCharge")) === null || _96 === void 0 ? void 0 : _96.toString())) !== null && _97 !== void 0 ? _97 : null,
        fridayAdultExtraGuestChargeWithGST: (_99 = parseNumber((_98 = formData.get("fridayAdultExtraGuestChargeWithGST")) === null || _98 === void 0 ? void 0 : _98.toString())) !== null && _99 !== void 0 ? _99 : null,
        fridayChildExtraGuestCharge: (_101 = parseNumber((_100 = formData.get("fridayChildExtraGuestCharge")) === null || _100 === void 0 ? void 0 : _100.toString())) !== null && _101 !== void 0 ? _101 : null,
        fridayChildExtraGuestChargeWithGST: (_103 = parseNumber((_102 = formData.get("fridayChildExtraGuestChargeWithGST")) === null || _102 === void 0 ? void 0 : _102.toString())) !== null && _103 !== void 0 ? _103 : null,
        fridayInfantExtraGuestCharge: (_105 = parseNumber((_104 = formData.get("fridayInfantExtraGuestCharge")) === null || _104 === void 0 ? void 0 : _104.toString())) !== null && _105 !== void 0 ? _105 : null,
        fridayInfantExtraGuestChargeWithGST: (_107 = parseNumber((_106 = formData.get("fridayInfantExtraGuestChargeWithGST")) === null || _106 === void 0 ? void 0 : _106.toString())) !== null && _107 !== void 0 ? _107 : null,
        fridayBaseGuestCount: (_109 = parseNumber((_108 = formData.get("fridayBaseGuestCount")) === null || _108 === void 0 ? void 0 : _108.toString())) !== null && _109 !== void 0 ? _109 : null,
        fridayDiscount: (_111 = parseNumber((_110 = formData.get("fridayDiscount")) === null || _110 === void 0 ? void 0 : _110.toString())) !== null && _111 !== void 0 ? _111 : null,
        fridayGSTslab: (_113 = parseNumber((_112 = formData.get("fridayGSTslab")) === null || _112 === void 0 ? void 0 : _112.toString())) !== null && _113 !== void 0 ? _113 : null,
        fridayMaxExtraGuestPrice: (_115 = parseNumber((_114 = formData.get("fridayMaxExtraGuestPrice")) === null || _114 === void 0 ? void 0 : _114.toString())) !== null && _115 !== void 0 ? _115 : null,
        fridayMaxTotal: (_117 = parseNumber((_116 = formData.get("fridayMaxTotal")) === null || _116 === void 0 ? void 0 : _116.toString())) !== null && _117 !== void 0 ? _117 : null,
        saturdayPrice: (_119 = parseNumber((_118 = formData.get("saturdayPrice")) === null || _118 === void 0 ? void 0 : _118.toString())) !== null && _119 !== void 0 ? _119 : null,
        saturdayPriceWithGST: (_121 = parseNumber((_120 = formData.get("saturdayPriceWithGST")) === null || _120 === void 0 ? void 0 : _120.toString())) !== null && _121 !== void 0 ? _121 : null,
        saturdayAdultExtraGuestCharge: (_123 = parseNumber((_122 = formData.get("saturdayAdultExtraGuestCharge")) === null || _122 === void 0 ? void 0 : _122.toString())) !== null && _123 !== void 0 ? _123 : null,
        saturdayAdultExtraGuestChargeWithGST: (_125 = parseNumber((_124 = formData.get("saturdayAdultExtraGuestChargeWithGST")) === null || _124 === void 0 ? void 0 : _124.toString())) !== null && _125 !== void 0 ? _125 : null,
        saturdayChildExtraGuestCharge: (_127 = parseNumber((_126 = formData.get("saturdayChildExtraGuestCharge")) === null || _126 === void 0 ? void 0 : _126.toString())) !== null && _127 !== void 0 ? _127 : null,
        saturdayChildExtraGuestChargeWithGST: (_129 = parseNumber((_128 = formData.get("saturdayChildExtraGuestChargeWithGST")) === null || _128 === void 0 ? void 0 : _128.toString())) !== null && _129 !== void 0 ? _129 : null,
        saturdayInfantExtraGuestCharge: (_131 = parseNumber((_130 = formData.get("saturdayInfantExtraGuestCharge")) === null || _130 === void 0 ? void 0 : _130.toString())) !== null && _131 !== void 0 ? _131 : null,
        saturdayInfantExtraGuestChargeWithGST: (_133 = parseNumber((_132 = formData.get("saturdayInfantExtraGuestChargeWithGST")) === null || _132 === void 0 ? void 0 : _132.toString())) !== null && _133 !== void 0 ? _133 : null,
        saturdayBaseGuestCount: (_135 = parseNumber((_134 = formData.get("saturdayBaseGuestCount")) === null || _134 === void 0 ? void 0 : _134.toString())) !== null && _135 !== void 0 ? _135 : null,
        saturdayDiscount: (_137 = parseNumber((_136 = formData.get("saturdayDiscount")) === null || _136 === void 0 ? void 0 : _136.toString())) !== null && _137 !== void 0 ? _137 : null,
        saturdayGSTslab: (_139 = parseNumber((_138 = formData.get("saturdayGSTslab")) === null || _138 === void 0 ? void 0 : _138.toString())) !== null && _139 !== void 0 ? _139 : null,
        saturdayMaxExtraGuestPrice: (_141 = parseNumber((_140 = formData.get("saturdayMaxExtraGuestPrice")) === null || _140 === void 0 ? void 0 : _140.toString())) !== null && _141 !== void 0 ? _141 : null,
        saturdayMaxTotal: (_143 = parseNumber((_142 = formData.get("saturdayMaxTotal")) === null || _142 === void 0 ? void 0 : _142.toString())) !== null && _143 !== void 0 ? _143 : null,
        sundayPrice: (_145 = parseNumber((_144 = formData.get("sundayPrice")) === null || _144 === void 0 ? void 0 : _144.toString())) !== null && _145 !== void 0 ? _145 : null,
        sundayPriceWithGST: (_147 = parseNumber((_146 = formData.get("sundayPriceWithGST")) === null || _146 === void 0 ? void 0 : _146.toString())) !== null && _147 !== void 0 ? _147 : null,
        sundayAdultExtraGuestCharge: (_149 = parseNumber((_148 = formData.get("sundayAdultExtraGuestCharge")) === null || _148 === void 0 ? void 0 : _148.toString())) !== null && _149 !== void 0 ? _149 : null,
        sundayAdultExtraGuestChargeWithGST: (_151 = parseNumber((_150 = formData.get("sundayAdultExtraGuestChargeWithGST")) === null || _150 === void 0 ? void 0 : _150.toString())) !== null && _151 !== void 0 ? _151 : null,
        sundayChildExtraGuestCharge: (_153 = parseNumber((_152 = formData.get("sundayChildExtraGuestCharge")) === null || _152 === void 0 ? void 0 : _152.toString())) !== null && _153 !== void 0 ? _153 : null,
        sundayChildExtraGuestChargeWithGST: (_155 = parseNumber((_154 = formData.get("sundayChildExtraGuestChargeWithGST")) === null || _154 === void 0 ? void 0 : _154.toString())) !== null && _155 !== void 0 ? _155 : null,
        sundayInfantExtraGuestCharge: (_157 = parseNumber((_156 = formData.get("sundayInfantExtraGuestCharge")) === null || _156 === void 0 ? void 0 : _156.toString())) !== null && _157 !== void 0 ? _157 : null,
        sundayInfantExtraGuestChargeWithGST: (_159 = parseNumber((_158 = formData.get("sundayInfantExtraGuestChargeWithGST")) === null || _158 === void 0 ? void 0 : _158.toString())) !== null && _159 !== void 0 ? _159 : null,
        sundayBaseGuestCount: (_161 = parseNumber((_160 = formData.get("sundayBaseGuestCount")) === null || _160 === void 0 ? void 0 : _160.toString())) !== null && _161 !== void 0 ? _161 : null,
        sundayDiscount: (_163 = parseNumber((_162 = formData.get("sundayDiscount")) === null || _162 === void 0 ? void 0 : _162.toString())) !== null && _163 !== void 0 ? _163 : null,
        sundayGSTslab: (_165 = parseNumber((_164 = formData.get("sundayGSTslab")) === null || _164 === void 0 ? void 0 : _164.toString())) !== null && _165 !== void 0 ? _165 : null,
        sundayMaxExtraGuestPrice: (_167 = parseNumber((_166 = formData.get("sundayMaxExtraGuestPrice")) === null || _166 === void 0 ? void 0 : _166.toString())) !== null && _167 !== void 0 ? _167 : null,
        sundayMaxTotal: (_169 = parseNumber((_168 = formData.get("sundayMaxTotal")) === null || _168 === void 0 ? void 0 : _168.toString())) !== null && _169 !== void 0 ? _169 : null,
        // Floating guest charges (day-wise)
        mondayFloatingAdultExtraGuestCharge: (_171 = parseNumber((_170 = formData.get("mondayFloatingAdultExtraGuestCharge")) === null || _170 === void 0 ? void 0 : _170.toString())) !== null && _171 !== void 0 ? _171 : null,
        mondayFloatingChildExtraGuestCharge: (_173 = parseNumber((_172 = formData.get("mondayFloatingChildExtraGuestCharge")) === null || _172 === void 0 ? void 0 : _172.toString())) !== null && _173 !== void 0 ? _173 : null,
        mondayFloatingInfantExtraGuestCharge: (_175 = parseNumber((_174 = formData.get("mondayFloatingInfantExtraGuestCharge")) === null || _174 === void 0 ? void 0 : _174.toString())) !== null && _175 !== void 0 ? _175 : null,
        mondayFloatingAdultExtraGuestChargeWithGST: (_177 = parseNumber((_176 = formData.get("mondayFloatingAdultExtraGuestChargeWithGST")) === null || _176 === void 0 ? void 0 : _176.toString())) !== null && _177 !== void 0 ? _177 : null,
        mondayFloatingChildExtraGuestChargeWithGST: (_179 = parseNumber((_178 = formData.get("mondayFloatingChildExtraGuestChargeWithGST")) === null || _178 === void 0 ? void 0 : _178.toString())) !== null && _179 !== void 0 ? _179 : null,
        mondayFloatingInfantExtraGuestChargeWithGST: (_181 = parseNumber((_180 = formData.get("mondayFloatingInfantExtraGuestChargeWithGST")) === null || _180 === void 0 ? void 0 : _180.toString())) !== null && _181 !== void 0 ? _181 : null,
        tuesdayFloatingAdultExtraGuestCharge: (_183 = parseNumber((_182 = formData.get("tuesdayFloatingAdultExtraGuestCharge")) === null || _182 === void 0 ? void 0 : _182.toString())) !== null && _183 !== void 0 ? _183 : null,
        tuesdayFloatingChildExtraGuestCharge: (_185 = parseNumber((_184 = formData.get("tuesdayFloatingChildExtraGuestCharge")) === null || _184 === void 0 ? void 0 : _184.toString())) !== null && _185 !== void 0 ? _185 : null,
        tuesdayFloatingInfantExtraGuestCharge: (_187 = parseNumber((_186 = formData.get("tuesdayFloatingInfantExtraGuestCharge")) === null || _186 === void 0 ? void 0 : _186.toString())) !== null && _187 !== void 0 ? _187 : null,
        tuesdayFloatingAdultExtraGuestChargeWithGST: (_189 = parseNumber((_188 = formData.get("tuesdayFloatingAdultExtraGuestChargeWithGST")) === null || _188 === void 0 ? void 0 : _188.toString())) !== null && _189 !== void 0 ? _189 : null,
        tuesdayFloatingChildExtraGuestChargeWithGST: (_191 = parseNumber((_190 = formData.get("tuesdayFloatingChildExtraGuestChargeWithGST")) === null || _190 === void 0 ? void 0 : _190.toString())) !== null && _191 !== void 0 ? _191 : null,
        tuesdayFloatingInfantExtraGuestChargeWithGST: (_193 = parseNumber((_192 = formData.get("tuesdayFloatingInfantExtraGuestChargeWithGST")) === null || _192 === void 0 ? void 0 : _192.toString())) !== null && _193 !== void 0 ? _193 : null,
        wednesdayFloatingAdultExtraGuestCharge: (_195 = parseNumber((_194 = formData.get("wednesdayFloatingAdultExtraGuestCharge")) === null || _194 === void 0 ? void 0 : _194.toString())) !== null && _195 !== void 0 ? _195 : null,
        wednesdayFloatingChildExtraGuestCharge: (_197 = parseNumber((_196 = formData.get("wednesdayFloatingChildExtraGuestCharge")) === null || _196 === void 0 ? void 0 : _196.toString())) !== null && _197 !== void 0 ? _197 : null,
        wednesdayFloatingInfantExtraGuestCharge: (_199 = parseNumber((_198 = formData.get("wednesdayFloatingInfantExtraGuestCharge")) === null || _198 === void 0 ? void 0 : _198.toString())) !== null && _199 !== void 0 ? _199 : null,
        wednesdayFloatingAdultExtraGuestChargeWithGST: (_201 = parseNumber((_200 = formData.get("wednesdayFloatingAdultExtraGuestChargeWithGST")) === null || _200 === void 0 ? void 0 : _200.toString())) !== null && _201 !== void 0 ? _201 : null,
        wednesdayFloatingChildExtraGuestChargeWithGST: (_203 = parseNumber((_202 = formData.get("wednesdayFloatingChildExtraGuestChargeWithGST")) === null || _202 === void 0 ? void 0 : _202.toString())) !== null && _203 !== void 0 ? _203 : null,
        wednesdayFloatingInfantExtraGuestChargeWithGST: (_205 = parseNumber((_204 = formData.get("wednesdayFloatingInfantExtraGuestChargeWithGST")) === null || _204 === void 0 ? void 0 : _204.toString())) !== null && _205 !== void 0 ? _205 : null,
        thursdayFloatingAdultExtraGuestCharge: (_207 = parseNumber((_206 = formData.get("thursdayFloatingAdultExtraGuestCharge")) === null || _206 === void 0 ? void 0 : _206.toString())) !== null && _207 !== void 0 ? _207 : null,
        thursdayFloatingChildExtraGuestCharge: (_209 = parseNumber((_208 = formData.get("thursdayFloatingChildExtraGuestCharge")) === null || _208 === void 0 ? void 0 : _208.toString())) !== null && _209 !== void 0 ? _209 : null,
        thursdayFloatingInfantExtraGuestCharge: (_211 = parseNumber((_210 = formData.get("thursdayFloatingInfantExtraGuestCharge")) === null || _210 === void 0 ? void 0 : _210.toString())) !== null && _211 !== void 0 ? _211 : null,
        thursdayFloatingAdultExtraGuestChargeWithGST: (_213 = parseNumber((_212 = formData.get("thursdayFloatingAdultExtraGuestChargeWithGST")) === null || _212 === void 0 ? void 0 : _212.toString())) !== null && _213 !== void 0 ? _213 : null,
        thursdayFloatingChildExtraGuestChargeWithGST: (_215 = parseNumber((_214 = formData.get("thursdayFloatingChildExtraGuestChargeWithGST")) === null || _214 === void 0 ? void 0 : _214.toString())) !== null && _215 !== void 0 ? _215 : null,
        thursdayFloatingInfantExtraGuestChargeWithGST: (_217 = parseNumber((_216 = formData.get("thursdayFloatingInfantExtraGuestChargeWithGST")) === null || _216 === void 0 ? void 0 : _216.toString())) !== null && _217 !== void 0 ? _217 : null,
        fridayFloatingAdultExtraGuestCharge: (_219 = parseNumber((_218 = formData.get("fridayFloatingAdultExtraGuestCharge")) === null || _218 === void 0 ? void 0 : _218.toString())) !== null && _219 !== void 0 ? _219 : null,
        fridayFloatingChildExtraGuestCharge: (_221 = parseNumber((_220 = formData.get("fridayFloatingChildExtraGuestCharge")) === null || _220 === void 0 ? void 0 : _220.toString())) !== null && _221 !== void 0 ? _221 : null,
        fridayFloatingInfantExtraGuestCharge: (_223 = parseNumber((_222 = formData.get("fridayFloatingInfantExtraGuestCharge")) === null || _222 === void 0 ? void 0 : _222.toString())) !== null && _223 !== void 0 ? _223 : null,
        fridayFloatingAdultExtraGuestChargeWithGST: (_225 = parseNumber((_224 = formData.get("fridayFloatingAdultExtraGuestChargeWithGST")) === null || _224 === void 0 ? void 0 : _224.toString())) !== null && _225 !== void 0 ? _225 : null,
        fridayFloatingChildExtraGuestChargeWithGST: (_227 = parseNumber((_226 = formData.get("fridayFloatingChildExtraGuestChargeWithGST")) === null || _226 === void 0 ? void 0 : _226.toString())) !== null && _227 !== void 0 ? _227 : null,
        fridayFloatingInfantExtraGuestChargeWithGST: (_229 = parseNumber((_228 = formData.get("fridayFloatingInfantExtraGuestChargeWithGST")) === null || _228 === void 0 ? void 0 : _228.toString())) !== null && _229 !== void 0 ? _229 : null,
        saturdayFloatingAdultExtraGuestCharge: (_231 = parseNumber((_230 = formData.get("saturdayFloatingAdultExtraGuestCharge")) === null || _230 === void 0 ? void 0 : _230.toString())) !== null && _231 !== void 0 ? _231 : null,
        saturdayFloatingChildExtraGuestCharge: (_233 = parseNumber((_232 = formData.get("saturdayFloatingChildExtraGuestCharge")) === null || _232 === void 0 ? void 0 : _232.toString())) !== null && _233 !== void 0 ? _233 : null,
        saturdayFloatingInfantExtraGuestCharge: (_235 = parseNumber((_234 = formData.get("saturdayFloatingInfantExtraGuestCharge")) === null || _234 === void 0 ? void 0 : _234.toString())) !== null && _235 !== void 0 ? _235 : null,
        saturdayFloatingAdultExtraGuestChargeWithGST: (_237 = parseNumber((_236 = formData.get("saturdayFloatingAdultExtraGuestChargeWithGST")) === null || _236 === void 0 ? void 0 : _236.toString())) !== null && _237 !== void 0 ? _237 : null,
        saturdayFloatingChildExtraGuestChargeWithGST: (_239 = parseNumber((_238 = formData.get("saturdayFloatingChildExtraGuestChargeWithGST")) === null || _238 === void 0 ? void 0 : _238.toString())) !== null && _239 !== void 0 ? _239 : null,
        saturdayFloatingInfantExtraGuestChargeWithGST: (_241 = parseNumber((_240 = formData.get("saturdayFloatingInfantExtraGuestChargeWithGST")) === null || _240 === void 0 ? void 0 : _240.toString())) !== null && _241 !== void 0 ? _241 : null,
        sundayFloatingAdultExtraGuestCharge: (_243 = parseNumber((_242 = formData.get("sundayFloatingAdultExtraGuestCharge")) === null || _242 === void 0 ? void 0 : _242.toString())) !== null && _243 !== void 0 ? _243 : null,
        sundayFloatingChildExtraGuestCharge: (_245 = parseNumber((_244 = formData.get("sundayFloatingChildExtraGuestCharge")) === null || _244 === void 0 ? void 0 : _244.toString())) !== null && _245 !== void 0 ? _245 : null,
        sundayFloatingInfantExtraGuestCharge: (_247 = parseNumber((_246 = formData.get("sundayFloatingInfantExtraGuestCharge")) === null || _246 === void 0 ? void 0 : _246.toString())) !== null && _247 !== void 0 ? _247 : null,
        sundayFloatingAdultExtraGuestChargeWithGST: (_249 = parseNumber((_248 = formData.get("sundayFloatingAdultExtraGuestChargeWithGST")) === null || _248 === void 0 ? void 0 : _248.toString())) !== null && _249 !== void 0 ? _249 : null,
        sundayFloatingChildExtraGuestChargeWithGST: (_251 = parseNumber((_250 = formData.get("sundayFloatingChildExtraGuestChargeWithGST")) === null || _250 === void 0 ? void 0 : _250.toString())) !== null && _251 !== void 0 ? _251 : null,
        sundayFloatingInfantExtraGuestChargeWithGST: (_253 = parseNumber((_252 = formData.get("sundayFloatingInfantExtraGuestChargeWithGST")) === null || _252 === void 0 ? void 0 : _252.toString())) !== null && _253 !== void 0 ? _253 : null,
        isDisabled: (_255 = parseBoolean((_254 = formData.get("isDisabled")) === null || _254 === void 0 ? void 0 : _254.toString())) !== null && _255 !== void 0 ? _255 : null,
        bedroomCount: (_257 = parseNumber((_256 = formData.get("bedroomCount")) === null || _256 === void 0 ? void 0 : _256.toString())) !== null && _257 !== void 0 ? _257 : null,
        bathroomCount: (_259 = parseNumber((_258 = formData.get("bathroomCount")) === null || _258 === void 0 ? void 0 : _258.toString())) !== null && _259 !== void 0 ? _259 : null,
        doubleBedCount: (_261 = parseNumber((_260 = formData.get("doubleBedCount")) === null || _260 === void 0 ? void 0 : _260.toString())) !== null && _261 !== void 0 ? _261 : null,
        singleBedCount: (_263 = parseNumber((_262 = formData.get("singleBedCount")) === null || _262 === void 0 ? void 0 : _262.toString())) !== null && _263 !== void 0 ? _263 : null,
        mattressCount: (_265 = parseNumber((_264 = formData.get("mattressCount")) === null || _264 === void 0 ? void 0 : _264.toString())) !== null && _265 !== void 0 ? _265 : null,
        bookingType: (_267 = parseString((_266 = formData.get("bookingType")) === null || _266 === void 0 ? void 0 : _266.toString())) !== null && _267 !== void 0 ? _267 : null,
        checkinTime: (_269 = validateTimeStr((_268 = formData.get("checkinTime")) === null || _268 === void 0 ? void 0 : _268.toString())) !== null && _269 !== void 0 ? _269 : null,
        checkoutTime: (_271 = validateTimeStr((_270 = formData.get("checkoutTime")) === null || _270 === void 0 ? void 0 : _270.toString())) !== null && _271 !== void 0 ? _271 : null,
        latitude: (_273 = parseString((_272 = formData.get("latitude")) === null || _272 === void 0 ? void 0 : _272.toString())) !== null && _273 !== void 0 ? _273 : null,
        longitude: (_275 = parseString((_274 = formData.get("longitude")) === null || _274 === void 0 ? void 0 : _274.toString())) !== null && _275 !== void 0 ? _275 : null,
        mapLink: (_277 = parseString((_276 = formData.get("mapLink")) === null || _276 === void 0 ? void 0 : _276.toString())) !== null && _277 !== void 0 ? _277 : null,
        // Accept empty string as null to allow clearing
        googlePlaceId: (function () {
            var _a;
            var v = (_a = formData.get("googlePlaceId")) === null || _a === void 0 ? void 0 : _a.toString();
            return v && v.trim().length > 0 ? v : null;
        })(),
        googlePlaceRating: (function () {
            var _a;
            var v = (_a = formData.get("googlePlaceRating")) === null || _a === void 0 ? void 0 : _a.toString();
            return v && v.trim().length > 0 ? v : null;
        })(),
        googlePlaceUserRatingCount: (function () {
            var _a;
            var v = (_a = formData.get("googlePlaceUserRatingCount")) === null || _a === void 0 ? void 0 : _a.toString();
            if (!v || v.trim().length === 0)
                return null;
            var n = Number(v);
            if (Number.isNaN(n))
                throw new Error("Invalid Google user rating count");
            return n;
        })(),
        address: (_279 = parseString((_278 = formData.get("address")) === null || _278 === void 0 ? void 0 : _278.toString())) !== null && _279 !== void 0 ? _279 : null,
        landmark: (_281 = parseString((_280 = formData.get("landmark")) === null || _280 === void 0 ? void 0 : _280.toString())) !== null && _281 !== void 0 ? _281 : null,
        village: (_283 = parseString((_282 = formData.get("village")) === null || _282 === void 0 ? void 0 : _282.toString())) !== null && _283 !== void 0 ? _283 : null,
        areaId: (_285 = parseString((_284 = formData.get("areaId")) === null || _284 === void 0 ? void 0 : _284.toString())) !== null && _285 !== void 0 ? _285 : null,
        secondaryAreaId1: (_287 = parseString((_286 = formData.get("secondaryAreaId1")) === null || _286 === void 0 ? void 0 : _286.toString())) !== null && _287 !== void 0 ? _287 : null,
        secondaryAreaId2: (_289 = parseString((_288 = formData.get("secondaryAreaId2")) === null || _288 === void 0 ? void 0 : _288.toString())) !== null && _289 !== void 0 ? _289 : null,
        secondaryAreaId3: (_291 = parseString((_290 = formData.get("secondaryAreaId3")) === null || _290 === void 0 ? void 0 : _290.toString())) !== null && _291 !== void 0 ? _291 : null,
        secondaryAreaId4: (_293 = parseString((_292 = formData.get("secondaryAreaId4")) === null || _292 === void 0 ? void 0 : _292.toString())) !== null && _293 !== void 0 ? _293 : null,
        cityId: (_295 = parseString((_294 = formData.get("cityId")) === null || _294 === void 0 ? void 0 : _294.toString())) !== null && _295 !== void 0 ? _295 : null,
        stateId: (_297 = parseString((_296 = formData.get("stateId")) === null || _296 === void 0 ? void 0 : _296.toString())) !== null && _297 !== void 0 ? _297 : null,
        pincode: (_299 = parseString((_298 = formData.get("pincode")) === null || _298 === void 0 ? void 0 : _298.toString())) !== null && _299 !== void 0 ? _299 : null,
        propertyTypeId: (_301 = parseString((_300 = formData.get("propertyTypeId")) === null || _300 === void 0 ? void 0 : _300.toString())) !== null && _301 !== void 0 ? _301 : null,
        // activities: activities,
        // amenities: amenities,
        allowEnquiry: (_303 = parseBoolean((_302 = formData.get("allowEnquiry")) === null || _302 === void 0 ? void 0 : _302.toString())) !== null && _303 !== void 0 ? _303 : false,
        allowOnlineBooking: (_305 = parseBoolean((_304 = formData.get("allowOnlineBooking")) === null || _304 === void 0 ? void 0 : _304.toString())) !== null && _305 !== void 0 ? _305 : false,
        allowCallBooking: (_307 = parseBoolean((_306 = formData.get("allowCallBooking")) === null || _306 === void 0 ? void 0 : _306.toString())) !== null && _307 !== void 0 ? _307 : false,
        commissionPercentage: (_309 = parseNumber((_308 = formData.get("commissionPercentage")) === null || _308 === void 0 ? void 0 : _308.toString())) !== null && _309 !== void 0 ? _309 : 0,
        securityDeposit: (_311 = parseNumber((_310 = formData.get("securityDeposit")) === null || _310 === void 0 ? void 0 : _310.toString())) !== null && _311 !== void 0 ? _311 : 0,
        cookingAccessFee: (_313 = parseNumber((_312 = formData.get("cookingAccessFee")) === null || _312 === void 0 ? void 0 : _312.toString())) !== null && _313 !== void 0 ? _313 : 0,
        weight: (_315 = parseString((_314 = formData.get("weight")) === null || _314 === void 0 ? void 0 : _314.toString())) !== null && _315 !== void 0 ? _315 : "0",
        requiresConfirmation: parseBoolean((_316 = formData.get("requiresConfirmation")) === null || _316 === void 0 ? void 0 : _316.toString()),
        advancePaymentEnabled: parseBoolean((_317 = formData.get("advancePaymentEnabled")) === null || _317 === void 0 ? void 0 : _317.toString()),
        advancePaymentAmount: (_319 = parseNumber((_318 = formData.get("advancePaymentAmount")) === null || _318 === void 0 ? void 0 : _318.toString())) !== null && _319 !== void 0 ? _319 : null,
        advancePaymentPercentage: (_321 = parseNumber((_320 = formData.get("advancePaymentPercentage")) === null || _320 === void 0 ? void 0 : _320.toString())) !== null && _321 !== void 0 ? _321 : null,
        enableFloatingGuests: parseBoolean((_322 = formData.get("enableFloatingGuests")) === null || _322 === void 0 ? void 0 : _322.toString()),
        slug: (_324 = parseString((_323 = formData.get("slug")) === null || _323 === void 0 ? void 0 : _323.toString())) !== null && _324 !== void 0 ? _324 : null,
        showOnInstafarms: (_326 = parseBoolean((_325 = formData.get("showOnInstafarms")) === null || _325 === void 0 ? void 0 : _325.toString())) !== null && _326 !== void 0 ? _326 : true,
        showOnListing: (_328 = parseBoolean((_327 = formData.get("showOnListing")) === null || _327 === void 0 ? void 0 : _327.toString())) !== null && _328 !== void 0 ? _328 : true,
        isPresentOnMago: (_330 = parseBoolean((_329 = formData.get("isPresentOnMago")) === null || _329 === void 0 ? void 0 : _329.toString())) !== null && _330 !== void 0 ? _330 : false,
        bookingPolicy: (_332 = parseString((_331 = formData.get("bookingPolicy")) === null || _331 === void 0 ? void 0 : _331.toString())) !== null && _332 !== void 0 ? _332 : "",
        faqs: [], // Add default value
        meta: {}, // Add default value - must be object (Record<string, any>), not array
        sections: null,
        // Audit system fields
        propertyManagementType: (_334 = parseString((_333 = formData.get("propertyManagementType")) === null || _333 === void 0 ? void 0 : _333.toString())) !== null && _334 !== void 0 ? _334 : null,
        auditEnabled: parseBoolean((_335 = formData.get("auditEnabled")) === null || _335 === void 0 ? void 0 : _335.toString()),
        maxAuditGapDays: (_337 = parseNumber((_336 = formData.get("maxAuditGapDays")) === null || _336 === void 0 ? void 0 : _336.toString())) !== null && _337 !== void 0 ? _337 : null,
        auditComplianceStatus: (_339 = parseString((_338 = formData.get("auditComplianceStatus")) === null || _338 === void 0 ? void 0 : _338.toString())) !== null && _339 !== void 0 ? _339 : null,
    };
}
function parseUserFormData(formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var firstName = parseString((_a = formData.get("firstName")) === null || _a === void 0 ? void 0 : _a.toString());
    var email = parseString((_b = formData.get("email")) === null || _b === void 0 ? void 0 : _b.toString());
    var mobileNumber = parseString((_c = formData.get("mobileNumber")) === null || _c === void 0 ? void 0 : _c.toString());
    if (!firstName) {
        throw new Error("Name missing.");
    }
    if (!email) {
        throw new Error("Email missing.");
    }
    if (!mobileNumber) {
        throw new Error("Mobile Number missing.");
    }
    return {
        id: (0, uuid_1.v4)(),
        firstName: firstName,
        lastName: parseString((_d = formData.get("lastName")) === null || _d === void 0 ? void 0 : _d.toString()),
        mobileNumber: mobileNumber,
        whatsappNumber: parseString((_e = formData.get("whatsappNumber")) === null || _e === void 0 ? void 0 : _e.toString()),
        email: email.toLowerCase(),
        gender: (function () {
            var _a;
            var genderValue = parseString((_a = formData.get("gender")) === null || _a === void 0 ? void 0 : _a.toString());
            return (genderValue === "Male" || genderValue === "Female") ? genderValue : null;
        })(),
        alternateContact: parseString((_f = formData.get("alternateContact")) === null || _f === void 0 ? void 0 : _f.toString()),
        bankAccounts: [],
        addressDetails: (_h = parseString((_g = formData.get("addressDetails")) === null || _g === void 0 ? void 0 : _g.toString())) !== null && _h !== void 0 ? _h : null,
    };
}
function parseCancellationFormData(formData) {
    var _a, _b;
    var refundAmount = parseNumber((_a = formData.get("refundAmount")) === null || _a === void 0 ? void 0 : _a.toString());
    var refundStatus = types_1.refundStatusOptions.find(function (x) { var _a; return x === ((_a = formData.get("refundStatus")) === null || _a === void 0 ? void 0 : _a.toString()); });
    var cancellationType = types_1.cancellationTypeOptions.find(function (x) { var _a; return x === ((_a = formData.get("cancellationType")) === null || _a === void 0 ? void 0 : _a.toString()); });
    var referencePersonId = parseString((_b = formData.get("cancellationReferencePersonId")) === null || _b === void 0 ? void 0 : _b.toString());
    if (!refundAmount && refundAmount !== 0) {
        throw new Error("Invalid Refund Amount");
    }
    if (!refundStatus) {
        throw new Error("Invalid Refund Status");
    }
    if (!cancellationType) {
        throw new Error("Invalid Cancellation type.");
    }
    // referencePersonId is now optional for simplified cancel flow
    return {
        refundAmount: refundAmount,
        refundStatus: refundStatus,
        cancellationType: cancellationType,
        referencePersonId: referencePersonId || null,
    };
}
function parsePaymentFormData(formData) {
    var ids = [];
    for (var _i = 0, _a = formData.keys(); _i < _a.length; _i++) {
        var key = _a[_i];
        if (key.startsWith("payment-amount-")) {
            ids.push(key.substring(15));
        }
    }
    var data = ids.map(function (id) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        var amount = parseNumber((_a = formData.get("payment-amount-".concat(id))) === null || _a === void 0 ? void 0 : _a.toString());
        var paymentDate = parseString((_b = formData.get("payment-".concat(id))) === null || _b === void 0 ? void 0 : _b.toString());
        var referencePersonId = parseString((_c = formData.get("payment-referencePersonId-".concat(id))) === null || _c === void 0 ? void 0 : _c.toString());
        var paymentMode = types_1.paymentModeOptions.find(function (x) {
            var _a;
            return x ===
                parseString((_a = formData.get("payment-paymentMode-".concat(id))) === null || _a === void 0 ? void 0 : _a.toString());
        });
        var transactionType = types_1.transactionTypeOptions.find(function (x) {
            var _a;
            return x ===
                parseString((_a = formData.get("payment-transactionType-".concat(id))) === null || _a === void 0 ? void 0 : _a.toString());
        });
        var paymentType = types_1.paymentTypeOptions.find(function (x) {
            var _a;
            return x ===
                parseString((_a = formData.get("payment-paymentType-".concat(id))) === null || _a === void 0 ? void 0 : _a.toString());
        });
        if (!amount) {
            throw new Error("Invalid Amount.");
        }
        if (!paymentDate || !luxon_1.DateTime.fromSQL(paymentDate).isValid) {
            throw new Error("Invalid payment date.");
        }
        if (!referencePersonId) {
            throw new Error("No reference person selected.");
        }
        if (!transactionType) {
            throw new Error("Select transaction type.");
        }
        if (!paymentType) {
            throw new Error("Select payment type.");
        }
        if (!paymentMode) {
            throw new Error("Select payment mode.");
        }
        return {
            id: id,
            paymentDate: paymentDate,
            transactionType: transactionType,
            amount: amount,
            referencePersonId: referencePersonId,
            paymentType: paymentType,
            paymentMode: paymentMode,
            bankName: parseString((_d = formData.get("bankName-".concat(id))) === null || _d === void 0 ? void 0 : _d.toString()),
            bankAccountHolderName: parseString((_e = formData.get("bankAccountHolderName-".concat(id))) === null || _e === void 0 ? void 0 : _e.toString()),
            bankAccountNumber: parseString((_f = formData.get("bankAccountNumber-".concat(id))) === null || _f === void 0 ? void 0 : _f.toString()),
            bankIfsc: parseString((_g = formData.get("bankIfsc-".concat(id))) === null || _g === void 0 ? void 0 : _g.toString()),
            bankNickname: parseString((_h = formData.get("bankNickname-".concat(id))) === null || _h === void 0 ? void 0 : _h.toString()),
        };
    });
    return data;
}
function parseBankFormData(formData) {
    var ids = [];
    for (var _i = 0, _a = formData.keys(); _i < _a.length; _i++) {
        var key = _a[_i];
        if (key.startsWith("bankName-")) {
            ids.push(key.substring(9));
        }
    }
    return ids.map(function (id) {
        var _a, _b, _c, _d, _e;
        return ({
            id: id,
            bankName: parseString((_a = formData.get("bankName-".concat(id))) === null || _a === void 0 ? void 0 : _a.toString()),
            bankAccountHolderName: parseString((_b = formData.get("bankAccountHolderName-".concat(id))) === null || _b === void 0 ? void 0 : _b.toString()),
            bankAccountNumber: parseString((_c = formData.get("bankAccountNumber-".concat(id))) === null || _c === void 0 ? void 0 : _c.toString()),
            bankIfsc: parseString((_d = formData.get("bankIfsc-".concat(id))) === null || _d === void 0 ? void 0 : _d.toString()),
            bankNickname: parseString((_e = formData.get("bankNickname-".concat(id))) === null || _e === void 0 ? void 0 : _e.toString()),
        });
    });
}
function parseBookingFormData(formData) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79;
    var propertyId = parseString((_a = formData.get("propertyId")) === null || _a === void 0 ? void 0 : _a.toString());
    var bookingTypeStr = parseString((_b = formData.get("bookingType")) === null || _b === void 0 ? void 0 : _b.toString());
    var bookingType = bookingTypeStr
        ? schema_1.bookingTypeEnum.enumValues.find(function (x) { return x === bookingTypeStr; })
        : undefined;
    var customerId = parseString((_c = formData.get("customerId")) === null || _c === void 0 ? void 0 : _c.toString());
    var adultCount = parseNumber((_d = formData.get("adultCount")) === null || _d === void 0 ? void 0 : _d.toString());
    var childrenCount = parseNumber((_e = formData.get("childrenCount")) === null || _e === void 0 ? void 0 : _e.toString());
    var infantCount = parseNumber((_f = formData.get("infantCount")) === null || _f === void 0 ? void 0 : _f.toString());
    var checkinDate = validateDateStr((_g = formData.get("checkinDate")) === null || _g === void 0 ? void 0 : _g.toString());
    var checkoutDate = validateDateStr((_h = formData.get("checkoutDate")) === null || _h === void 0 ? void 0 : _h.toString());
    // Validations
    // Note: bookingType is optional for updates (when form might not include it)
    // Only validate if a bookingType value was provided but is invalid
    if (bookingTypeStr && !bookingType) {
        throw new Error("Invalid Booking type: \"".concat(bookingTypeStr, "\". Must be one of: ").concat(schema_1.bookingTypeEnum.enumValues.join(", ")));
    }
    // customerId is optional - admin can create bookings without selecting a customer
    // For updates, these fields might be optional (only validate if provided)
    // For creates, they are required
    // We'll validate only if values are provided but invalid
    if (adultCount !== null && adultCount !== undefined && adultCount < 0) {
        throw new Error("Adult count cannot be negative");
    }
    if (childrenCount !== null && childrenCount !== undefined && childrenCount < 0) {
        throw new Error("Enter number of children (must be 0 or greater)");
    }
    if (infantCount !== null && infantCount !== undefined && infantCount < 0) {
        throw new Error("Enter number of infants (must be 0 or greater)");
    }
    // Dates are optional for updates (might be disabled/read-only)
    // Only validate if provided but invalid
    if (checkinDate === null && ((_j = formData.get("checkinDate")) === null || _j === void 0 ? void 0 : _j.toString())) {
        throw new Error("Invalid checkin date");
    }
    if (checkoutDate === null && ((_k = formData.get("checkoutDate")) === null || _k === void 0 ? void 0 : _k.toString())) {
        throw new Error("Invalid checkout date");
    }
    // Only validate date range if both dates are provided
    if (checkinDate && checkoutDate) {
        var checkinDt = luxon_1.DateTime.fromSQL(checkinDate);
        var checkoutDt = luxon_1.DateTime.fromSQL(checkoutDate);
        if (checkoutDt.diff(checkinDt, "days").days < 1) {
            throw new Error("Check out date should be later than check in date");
        }
    }
    // Parse daywiseBreakup JSON if provided
    var daywiseBreakup = null;
    var daywiseBreakupStr = (_l = formData.get("daywiseBreakup")) === null || _l === void 0 ? void 0 : _l.toString();
    if (daywiseBreakupStr) {
        try {
            daywiseBreakup = JSON.parse(daywiseBreakupStr);
        }
        catch (e) {
            console.error("Error parsing daywiseBreakup:", e);
        }
    }
    // Build return object - use defaults for required fields when not provided (for updates)
    return {
        id: (0, uuid_1.v4)(),
        // Use a default value if bookingType is not provided (for updates)
        bookingType: (bookingType || "Offline"),
        propertyId: propertyId || "",
        entityId: (_o = parseString((_m = formData.get("entityId")) === null || _m === void 0 ? void 0 : _m.toString())) !== null && _o !== void 0 ? _o : null,
        customerId: (customerId === null || customerId === void 0 ? void 0 : customerId.trim()) || null,
        bookingSource: parseString((_p = formData.get("bookingSource")) === null || _p === void 0 ? void 0 : _p.toString()),
        // Use defaults for counts if not provided (for updates)
        adultCount: adultCount !== null && adultCount !== void 0 ? adultCount : 0,
        childrenCount: childrenCount !== null && childrenCount !== void 0 ? childrenCount : 0,
        infantCount: infantCount !== null && infantCount !== void 0 ? infantCount : 0,
        floatingAdultCount: (_r = parseNumber((_q = formData.get("floatingAdultCount")) === null || _q === void 0 ? void 0 : _q.toString())) !== null && _r !== void 0 ? _r : 0,
        floatingChildCount: (_t = parseNumber((_s = formData.get("floatingChildCount")) === null || _s === void 0 ? void 0 : _s.toString())) !== null && _t !== void 0 ? _t : 0,
        floatingInfantCount: (_v = parseNumber((_u = formData.get("floatingInfantCount")) === null || _u === void 0 ? void 0 : _u.toString())) !== null && _v !== void 0 ? _v : 0,
        // Use empty string if dates not provided (for updates)
        checkinDate: (checkinDate || ""),
        checkoutDate: (checkoutDate || ""),
        durationNights: (_x = parseNumber((_w = formData.get("durationNights")) === null || _w === void 0 ? void 0 : _w.toString())) !== null && _x !== void 0 ? _x : null,
        bookingRemarks: parseString((_y = formData.get("bookingRemarks")) === null || _y === void 0 ? void 0 : _y.toString()),
        specialRequests: parseString((_z = formData.get("specialRequests")) === null || _z === void 0 ? void 0 : _z.toString()),
        pdfBookingLink: parseString((_0 = formData.get("pdfBookingLink")) === null || _0 === void 0 ? void 0 : _0.toString()),
        // Commercial data
        baseRentalAmountWithGst: (_2 = parseNumber((_1 = formData.get("baseRentalAmountWithGst")) === null || _1 === void 0 ? void 0 : _1.toString())) !== null && _2 !== void 0 ? _2 : 0,
        extraAdultGuestChargeWithGst: (_4 = parseNumber((_3 = formData.get("extraAdultGuestChargeWithGst")) === null || _3 === void 0 ? void 0 : _3.toString())) !== null && _4 !== void 0 ? _4 : 0,
        extraChildGuestChargeWithGst: (_6 = parseNumber((_5 = formData.get("extraChildGuestChargeWithGst")) === null || _5 === void 0 ? void 0 : _5.toString())) !== null && _6 !== void 0 ? _6 : 0,
        floatingGuestCharge: (_8 = parseNumber((_7 = formData.get("floatingGuestCharge")) === null || _7 === void 0 ? void 0 : _7.toString())) !== null && _8 !== void 0 ? _8 : 0,
        bookingAmountWithGstBeforeDiscounts: (_10 = parseNumber((_9 = formData.get("bookingAmountWithGstBeforeDiscounts")) === null || _9 === void 0 ? void 0 : _9.toString())) !== null && _10 !== void 0 ? _10 : 0,
        totalDiscountAmount: (_12 = parseNumber((_11 = formData.get("totalDiscountAmount")) === null || _11 === void 0 ? void 0 : _11.toString())) !== null && _12 !== void 0 ? _12 : 0,
        totalDiscountPercentage: (_14 = parseNumber((_13 = formData.get("totalDiscountPercentage")) === null || _13 === void 0 ? void 0 : _13.toString())) !== null && _14 !== void 0 ? _14 : null,
        // Payment details
        isAdvancePayment: (_16 = parseBoolean((_15 = formData.get("isAdvancePayment")) === null || _15 === void 0 ? void 0 : _15.toString())) !== null && _16 !== void 0 ? _16 : false,
        bookingAmountPaidWithGst: (_18 = parseNumber((_17 = formData.get("bookingAmountPaidWithGst")) === null || _17 === void 0 ? void 0 : _17.toString())) !== null && _18 !== void 0 ? _18 : null,
        fullBookingAmountWithGst: (_20 = parseNumber((_19 = formData.get("fullBookingAmountWithGst")) === null || _19 === void 0 ? void 0 : _19.toString())) !== null && _20 !== void 0 ? _20 : null,
        remainingAmountToBePaidWithGst: (_22 = parseNumber((_21 = formData.get("remainingAmountToBePaidWithGst")) === null || _21 === void 0 ? void 0 : _21.toString())) !== null && _22 !== void 0 ? _22 : null,
        paymentGatewayCharge: (_24 = parseNumber((_23 = formData.get("paymentGatewayCharge")) === null || _23 === void 0 ? void 0 : _23.toString())) !== null && _24 !== void 0 ? _24 : 0,
        daywiseBreakup: daywiseBreakup,
        // All Discounts
        ownerDiscountValue: (_26 = parseNumber((_25 = formData.get("ownerDiscountValue")) === null || _25 === void 0 ? void 0 : _25.toString())) !== null && _26 !== void 0 ? _26 : null,
        ownerDiscountPercentage: (_28 = parseNumber((_27 = formData.get("ownerDiscountPercentage")) === null || _27 === void 0 ? void 0 : _27.toString())) !== null && _28 !== void 0 ? _28 : null,
        multipleNightsDiscountValue: (_30 = parseNumber((_29 = formData.get("multipleNightsDiscountValue")) === null || _29 === void 0 ? void 0 : _29.toString())) !== null && _30 !== void 0 ? _30 : null,
        multipleNightsDiscountPercentage: (_32 = parseNumber((_31 = formData.get("multipleNightsDiscountPercentage")) === null || _31 === void 0 ? void 0 : _31.toString())) !== null && _32 !== void 0 ? _32 : null,
        couponDiscountValue: (_34 = parseNumber((_33 = formData.get("couponDiscountValue")) === null || _33 === void 0 ? void 0 : _33.toString())) !== null && _34 !== void 0 ? _34 : null,
        couponDiscountType: parseString((_35 = formData.get("couponDiscountType")) === null || _35 === void 0 ? void 0 : _35.toString()),
        couponDiscountCode: parseString((_36 = formData.get("couponDiscountCode")) === null || _36 === void 0 ? void 0 : _36.toString()),
        couponId: parseString((_37 = formData.get("couponId")) === null || _37 === void 0 ? void 0 : _37.toString()),
        // Amount Distribution
        instafarmsCommission: (_39 = parseNumber((_38 = formData.get("instafarmsCommission")) === null || _38 === void 0 ? void 0 : _38.toString())) !== null && _39 !== void 0 ? _39 : null,
        ownerRevenue: (_41 = parseNumber((_40 = formData.get("ownerRevenue")) === null || _40 === void 0 ? void 0 : _40.toString())) !== null && _41 !== void 0 ? _41 : null,
        tds: (_43 = parseNumber((_42 = formData.get("tds")) === null || _42 === void 0 ? void 0 : _42.toString())) !== null && _43 !== void 0 ? _43 : null,
        totalGstCollected: (_45 = parseNumber((_44 = formData.get("totalGstCollected")) === null || _44 === void 0 ? void 0 : _44.toString())) !== null && _45 !== void 0 ? _45 : null,
        amountPayableToOwnerAfterTDS: (_47 = parseNumber((_46 = formData.get("amountPayableToOwnerAfterTDS")) === null || _46 === void 0 ? void 0 : _46.toString())) !== null && _47 !== void 0 ? _47 : null,
        bookingAmountWithDiscountBeforeGst: (_49 = parseNumber((_48 = formData.get("bookingAmountWithDiscountBeforeGst")) === null || _48 === void 0 ? void 0 : _48.toString())) !== null && _49 !== void 0 ? _49 : null,
        status: (_51 = parseString((_50 = formData.get("status")) === null || _50 === void 0 ? void 0 : _50.toString())) !== null && _51 !== void 0 ? _51 : "pending",
        // Add missing fields with defaults (for type compatibility)
        ownerSettlementStatus: (_53 = parseString((_52 = formData.get("ownerSettlementStatus")) === null || _52 === void 0 ? void 0 : _52.toString())) !== null && _53 !== void 0 ? _53 : null,
        ownerSettledAt: (_55 = parseString((_54 = formData.get("ownerSettledAt")) === null || _54 === void 0 ? void 0 : _54.toString())) !== null && _55 !== void 0 ? _55 : null,
        settlementBlocked: (_57 = parseBoolean((_56 = formData.get("settlementBlocked")) === null || _56 === void 0 ? void 0 : _56.toString())) !== null && _57 !== void 0 ? _57 : false,
        settlementBlockedBy: (_59 = parseString((_58 = formData.get("settlementBlockedBy")) === null || _58 === void 0 ? void 0 : _58.toString())) !== null && _59 !== void 0 ? _59 : null,
        settlementBlockedReason: (_61 = parseString((_60 = formData.get("settlementBlockedReason")) === null || _60 === void 0 ? void 0 : _60.toString())) !== null && _61 !== void 0 ? _61 : null,
        settlementBlockedAt: (_63 = parseString((_62 = formData.get("settlementBlockedAt")) === null || _62 === void 0 ? void 0 : _62.toString())) !== null && _63 !== void 0 ? _63 : null,
        settlementUnblockedAt: (_65 = parseString((_64 = formData.get("settlementUnblockedAt")) === null || _64 === void 0 ? void 0 : _64.toString())) !== null && _65 !== void 0 ? _65 : null,
        settlementUnblockedBy: (_67 = parseString((_66 = formData.get("settlementUnblockedBy")) === null || _66 === void 0 ? void 0 : _66.toString())) !== null && _67 !== void 0 ? _67 : null,
        settlementUnblockedReason: (_69 = parseString((_68 = formData.get("settlementUnblockedReason")) === null || _68 === void 0 ? void 0 : _68.toString())) !== null && _69 !== void 0 ? _69 : null,
        settlementNotes: (_71 = parseString((_70 = formData.get("settlementNotes")) === null || _70 === void 0 ? void 0 : _70.toString())) !== null && _71 !== void 0 ? _71 : null,
        settlementAmount: (_73 = parseNumber((_72 = formData.get("settlementAmount")) === null || _72 === void 0 ? void 0 : _72.toString())) !== null && _73 !== void 0 ? _73 : null,
        settlementTransactionId: (_75 = parseString((_74 = formData.get("settlementTransactionId")) === null || _74 === void 0 ? void 0 : _74.toString())) !== null && _75 !== void 0 ? _75 : null,
        settlementPaymentDate: (_77 = parseString((_76 = formData.get("settlementPaymentDate")) === null || _76 === void 0 ? void 0 : _76.toString())) !== null && _77 !== void 0 ? _77 : null,
        settlementPaymentMode: (_79 = parseString((_78 = formData.get("settlementPaymentMode")) === null || _78 === void 0 ? void 0 : _78.toString())) !== null && _79 !== void 0 ? _79 : null,
    };
}
function parseCustomerFormData(formData) {
    var _a, _b, _c, _d, _e;
    var firstName = parseString((_a = formData.get("firstName")) === null || _a === void 0 ? void 0 : _a.toString());
    var mobileNumber = parseString((_b = formData.get("mobileNumber")) === null || _b === void 0 ? void 0 : _b.toString());
    var dob = parseString((_c = formData.get("dob")) === null || _c === void 0 ? void 0 : _c.toString());
    var gender = schema_1.genderEnum.enumValues.find(function (x) { var _a; return x === parseString((_a = formData.get("gender")) === null || _a === void 0 ? void 0 : _a.toString()); });
    var email = parseString((_d = formData.get("email")) === null || _d === void 0 ? void 0 : _d.toString());
    if (!firstName) {
        throw new Error("Name missing.");
    }
    if (!gender) {
        throw new Error("Gender missing.");
    }
    if (!mobileNumber) {
        throw new Error("Mobile Number missing.");
    }
    if (email) {
        email = email.toLowerCase();
    }
    return {
        id: (0, uuid_1.v4)(),
        firstName: firstName,
        lastName: parseString((_e = formData.get("lastName")) === null || _e === void 0 ? void 0 : _e.toString()),
        mobileNumber: mobileNumber,
        dob: dob || null,
        email: email,
        gender: gender,
    };
}
function parseOwnerFormData(formData) {
    var _a, _b;
    var propertyId = parseString((_a = formData.get("propertyId")) === null || _a === void 0 ? void 0 : _a.toString());
    var ownerId = parseString((_b = formData.get("ownerId")) === null || _b === void 0 ? void 0 : _b.toString());
    if (!propertyId || propertyId.length === 0) {
        throw new Error("Invalid Property.");
    }
    if (!ownerId || ownerId.length == 0) {
        throw new Error("Invalid User.");
    }
    return { propertyId: propertyId, ownerId: ownerId };
}
