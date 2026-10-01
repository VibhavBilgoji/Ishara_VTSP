export function isStaffRole(role: string) {
  return ['doctor', 'hospital_staff', 'hospital_admin'].includes(role)
}
