import 'package:flutter/material.dart';
import 'style.dart';
import '../models/user.dart';
import 'faq.dart';

final user = User(
  id: "barber_123456",
  role: "barber",
  name: "Mario Rossi",
  email: "mario.rossi@email.com",
  phone: "+39 320 123 4567",
  passwordHash: "\$2a\$10\$xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  profileImageUrl: "https://example.com/images/barbers/mario-rossi.jpg",
  bio:
      "Barbiere con 10 anni di esperienza, specializzato in tagli moderni e rifiniture barba.",
  location: Location(
    address: "Via Roma 123, 00100 Roma",
    latitude: 41.9028,
    longitude: 12.4964,
  ),
);

class ProfiloPage extends StatelessWidget {
  const ProfiloPage({super.key});

  final TextStyle _style = const TextStyle(
    color: AppColors.textColor,
    fontWeight: FontWeight.bold,
    fontSize: 16,
  );

  void _showPopup(
    BuildContext context,
    String title,
    Widget content,
    List<Widget>? actions,
  ) {
    showDialog(
      context: context,
      builder:
          (_) => AlertDialog(
            backgroundColor: AppColors.textColor,
            title: Text(title),
            content: content,
            actions:
                actions ??
                [
                  TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text("Chiudi"),
                  ),
                ],
          ),
    );
  }

  Widget _infoText(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: RichText(
        text: TextSpan(
          text: "$label: ",
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.black87,
            fontSize: 15,
          ),
          children: [
            TextSpan(
              text: value,
              style: const TextStyle(
                fontWeight: FontWeight.normal,
                color: AppColors.primaryColor,
                fontSize: 15,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // Funzione helper per ListTile stilizzato
  Widget _settingsTile({
    required BuildContext context,
    required String title,
    required IconData icon,
    required VoidCallback onTap,
    Color iconColor = AppColors.secondaryColor,
  }) {
    return ListTile(
      tileColor: Colors.white.withOpacity(0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      title: Text(
        title,
        style: _style.copyWith(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: Colors.white,
        ),
      ),
      leading: Icon(icon, color: iconColor, size: 28),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
      onTap: onTap,
    );
  }

  // Funzioni onTap
  void _onProfileTap(BuildContext context, User user) {
    _showPopup(
      context,
      "Informazioni profilo",
      Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _infoText("ID", user.id),
            _infoText("Ruolo", user.role),
            _infoText("Nome", user.name),
            _infoText("Email", user.email),
            _infoText("Telefono", user.phone),
            _infoText("Bio", user.bio),
            _infoText("Indirizzo", user.location.address),
            _infoText("Latitudine", user.location.latitude.toString()),
            _infoText("Longitudine", user.location.longitude.toString()),
          ],
        ),
      ),
      [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Chiudi"),
        ),
      ],
    );
  }

  void _onPasswordTap(BuildContext context) {
    _showPopup(
      context,
      "Cambia Password",
      Column(
        mainAxisSize: MainAxisSize.min,
        children: const [
          TextField(
            decoration: InputDecoration(labelText: "Vecchia password"),
            obscureText: true,
          ),
          TextField(
            decoration: InputDecoration(labelText: "Nuova password"),
            obscureText: true,
          ),
          TextField(
            decoration: InputDecoration(labelText: "Conferma nuova password"),
            obscureText: true,
          ),
        ],
      ),
      [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("Chiudi"),
        ),
      ],
    );
  }

  void _onDeleteTap(BuildContext context) {
    _showPopup(
      context,
      "Conferma eliminazione",
      Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("Sei sicuro di voler eliminare l'account?"),
          const SizedBox(height: 16),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text("No"),
              ),
              TextButton(
                onPressed: () {
                  // TODO: elimina account
                  Navigator.pop(context);
                },
                child: const Text("Sì"),
              ),
            ],
          ),
        ],
      ),
      null,
    );
  }

  void _onFaqTap(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const FaqPage()),
    );
  }

  void _onSubscriptionTap(BuildContext context) {
    _showPopup(
      context,
      "Abbonamento",
      Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("Nessun abbonamento attivo."),
          const SizedBox(height: 8),
        ],
      ),
      [
        ElevatedButton(
          onPressed: () {
            // TODO: apri sito abbonamento
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.secondaryColor,
            foregroundColor: Colors.black,
          ),
          child: const Text("Abbonati ora"),
        ),
      ],
    );
  }

  void _onLogoutTap(BuildContext context) {
    _showPopup(
      context,
      "Logout",
      Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text("Sei sicuro di voler effettuare il logout?"),
          const SizedBox(height: 16),
        ],
      ),
      [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text("No"),
        ),
        TextButton(
          onPressed: () {
            // TODO: logout
            Navigator.pop(context);
          },
          child: const Text("Sì"),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        _settingsTile(
          context: context,
          title: "Informazioni profilo",
          icon: Icons.person,
          onTap: () => _onProfileTap(context,user),
        ),
        SizedBox(height: AppColors.space),
        _settingsTile(
          context: context,
          title: "Cambia password",
          icon: Icons.lock,
          onTap: () => _onPasswordTap(context),
        ),
        SizedBox(height: AppColors.space),
        _settingsTile(
          context: context,
          title: "FAQ",
          icon: Icons.help_outline,
          onTap: () => _onFaqTap(context),
        ),
        SizedBox(height: AppColors.space),
        _settingsTile(
          context: context,
          title: "Abbonamento",
          icon: Icons.subscriptions,
          onTap: () => _onSubscriptionTap(context),
        ),
        SizedBox(height: AppColors.space),
        _settingsTile(
          context: context,
          title: "Logout",
          icon: Icons.logout,
          onTap: () => _onLogoutTap(context),
        ),
        Spacer(),
        _settingsTile(
          context: context,
          title: "Elimina account",
          icon: Icons.delete,
          onTap: () => _onDeleteTap(context),
        ),
      ],
    );
  }
}
