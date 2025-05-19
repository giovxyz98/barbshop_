import 'package:flutter/material.dart';
import '../global/style.dart';

/// Home cliente con saluto personalizzato e lista prenotazioni attive (mock).
class HomeCliente extends StatelessWidget {
  const HomeCliente({super.key});

  /// Prenotazioni mock
  final List<_Booking> _bookings = const [
    _Booking(
      cliente: 'Luca Bianchi',
      servizio: 'Taglio + Barba',
      data: '18/05/2025',
      ora: '15:30',
    ),
    _Booking(
      cliente: 'Giulia Verdi',
      servizio: 'Shampoo',
      data: '19/05/2025',
      ora: '10:00',
    ),
    _Booking(
      cliente: 'Marco Neri',
      servizio: 'Rasatura',
      data: '20/05/2025',
      ora: '12:00',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundColor,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Saluto
              const Text(
                'Ciao user,',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 26,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              const Text(
                'benvenuto da salone',
                style: TextStyle(
                  color: AppColors.secondaryColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 32),

              // Titolo sezione
              const Text(
                'Prenotazioni attive',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 22,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // Lista prenotazioni o stato vuoto
              Expanded(
                child: _bookings.isEmpty
                    ? const Center(
                        child: Text(
                          'Non hai prenotazioni attive.',
                          style: TextStyle(color: Colors.white70, fontSize: 16),
                        ),
                      )
                    : ListView.builder(
                        itemCount: _bookings.length,
                        itemBuilder: (_, i) => _BookingCard(booking: _bookings[i]),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Modello prenotazione (privato alla pagina)
class _Booking {
  final String cliente;
  final String servizio;
  final String data;
  final String ora;

  const _Booking({
    required this.cliente,
    required this.servizio,
    required this.data,
    required this.ora,
  });
}

/// Card singola prenotazione
class _BookingCard extends StatelessWidget {
  final _Booking booking;
  const _BookingCard({required this.booking});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.secondaryColor, width: 1.4),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: AppColors.secondaryColor.withOpacity(0.2),
          child: const Icon(Icons.person, color: AppColors.secondaryColor),
        ),
        title: Text(
          booking.cliente,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w600,
            fontSize: 17,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                booking.servizio,
                style: const TextStyle(
                  color: AppColors.secondaryColor,
                  fontWeight: FontWeight.w500,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 2),
              Row(
                children: [
                  const Icon(Icons.calendar_today,
                      size: 14, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(
                    booking.data,
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                  const SizedBox(width: 12),
                  const Icon(Icons.access_time,
                      size: 14, color: Colors.white70),
                  const SizedBox(width: 4),
                  Text(
                    booking.ora,
                    style: const TextStyle(color: Colors.white70, fontSize: 14),
                  ),
                ],
              ),
            ],
          ),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
      ),
    );
  }
}
