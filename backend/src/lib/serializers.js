export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    pharmacyId: user.pharmacyId,
    mustUpdateProfile: user.mustUpdateProfile,
  };
}

export function serializePharmacy(pharmacy) {
  return {
    id: pharmacy.id,
    name: pharmacy.name,
    address: pharmacy.address,
    city: pharmacy.city,
    state: pharmacy.state,
    zipCode: pharmacy.zipCode,
    phone: pharmacy.phone,
    email: pharmacy.email,
    emergencyPhone: pharmacy.emergencyPhone,
    emergencyDesc: pharmacy.emergencyDesc,
    latitude: pharmacy.latitude?.toString() ?? null,
    longitude: pharmacy.longitude?.toString() ?? null,
    openingHours: pharmacy.openingHours,
    updatedAt: pharmacy.updatedAt,
  };
}