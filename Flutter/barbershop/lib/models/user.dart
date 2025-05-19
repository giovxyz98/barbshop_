class Location {
  final String address;
  final double latitude;
  final double longitude;

  Location({
    required this.address,
    required this.latitude,
    required this.longitude,
  });
}

class User {
  final String id;
  final String role;
  final String name;
  final String email;
  final String phone;
  final String passwordHash;
  final String profileImageUrl;
  final String bio;
  final Location location;

  User({
    required this.id,
    required this.role,
    required this.name,
    required this.email,
    required this.phone,
    required this.passwordHash,
    required this.profileImageUrl,
    required this.bio,
    required this.location,
  });
}