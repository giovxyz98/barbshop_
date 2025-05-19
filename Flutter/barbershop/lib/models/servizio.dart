class Servizio {
  final int id;
  final String nome;
  final int prezzo;
  final int durata;
  final String icon;

  Servizio({
    required this.id,
    required this.nome,
    required this.prezzo,
    required this.durata,
    required this.icon,
  });

  factory Servizio.fromJson(Map<String, dynamic> json) {
    return Servizio(
      id: json['id'],
      nome: json['nome'],
      prezzo: json['prezzo'],
      durata: json['durata'],
      icon: json['icon'] ?? '',
    );
  }
}