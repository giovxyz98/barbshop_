import 'package:flutter/material.dart';
import '../global/style.dart';



class PrenotazioniPage extends StatelessWidget {
  const PrenotazioniPage({super.key});

  Widget _bookingCard({
    required String cliente,
    required String servizio,
    required String data,
    required String ora,
    required IconData icon,
    Color iconColor = AppColors.secondaryColor,
    bool storico = false,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.12),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
        border: Border.all(
          color: storico ? Colors.grey.shade400 : AppColors.secondaryColor,
          width: 1.2,
        ),
      ),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: iconColor.withOpacity(0.15),
          child: Icon(icon, color: iconColor, size: 28),
        ),
        title: Text(
          cliente,
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: 17,
          ),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              servizio,
              style: const TextStyle(
                color: AppColors.secondaryColor,
                fontWeight: FontWeight.w500,
                fontSize: 15,
              ),
            ),
            const SizedBox(height: 2),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 15, color: Colors.white70),
                const SizedBox(width: 4),
                Text(
                  data,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
                const SizedBox(width: 12),
                Icon(Icons.access_time, size: 15, color: Colors.white70),
                const SizedBox(width: 4),
                Text(
                  ora,
                  style: const TextStyle(color: Colors.white70, fontSize: 14),
                ),
              ],
            ),
          ],
        ),
        trailing:
            storico
                ? null
                : IconButton(
                  icon: const Icon(
                    Icons.check_circle,
                    color: AppColors.secondaryColor,
                    size: 28,
                  ),
                  tooltip: "Segna come completata",
                  onPressed: () {
                    // Azione completa prenotazione
                  },
                ),
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 10,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Column(
        children: [
          Container(
            decoration: BoxDecoration(
              color: AppColors.primaryColor,
              borderRadius: const BorderRadius.vertical(
                bottom: Radius.circular(18),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.10),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const TabBar(
              indicatorColor: AppColors.secondaryColor,
              indicatorWeight: 4,
              labelColor: AppColors.secondaryColor,
              unselectedLabelColor: Colors.white,
              labelStyle: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              tabs: [Tab(text: "Attive"), Tab(text: "Storico")],
            ),
          ),
          Expanded(
            child: TabBarView(
              children: [
                // Prenotazioni attive
                ListView(
                  padding: const EdgeInsets.all(18),
                  children: [
                    _bookingCard(
                      cliente: "Luca Bianchi",
                      servizio: "Taglio + Barba",
                      data: "18/05/2025",
                      ora: "15:30",
                      icon: Icons.person,
                    ),
                    _bookingCard(
                      cliente: "Giulia Verdi",
                      servizio: "Shampoo",
                      data: "19/05/2025",
                      ora: "10:00",
                      icon: Icons.person,
                    ),
                  ],
                ),
                // Storico prenotazioni
                ListView(
                  padding: const EdgeInsets.all(18),
                  children: [
                    _bookingCard(
                      cliente: "Marco Neri",
                      servizio: "Taglio uomo",
                      data: "10/05/2025",
                      ora: "11:00",
                      icon: Icons.person,
                      storico: true,
                    ),
                    _bookingCard(
                      cliente: "Sara Blu",
                      servizio: "Barba",
                      data: "08/05/2025",
                      ora: "17:00",
                      icon: Icons.person,
                      storico: true,
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
