import 'package:flutter/material.dart';
import '../global/style.dart';


class ProdottiPage extends StatelessWidget {
  const ProdottiPage({super.key});

  static const TextStyle _tileStyle = TextStyle(
    color: Colors.white,
    fontWeight: FontWeight.w600,
    fontSize: 18,
  );

  Widget _productTile({
    required String title,
    required IconData icon,
    VoidCallback? onTap,
    Color iconColor = AppColors.secondaryColor,
    VoidCallback? onEdit,
    VoidCallback? onDelete,
  }) {
    return Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: ListTile(
        title: Text(title, style: _tileStyle),
        leading: Icon(icon, color: iconColor, size: 28),
        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
        onTap: onTap,
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.edit, color: AppColors.secondaryColor),
              onPressed: onEdit,
              tooltip: "Modifica",
            ),
            IconButton(
              icon: const Icon(Icons.delete, color: Colors.redAccent),
              onPressed: onDelete,
              tooltip: "Elimina",
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              _productTile(
                title: "Cera modellante",
                icon: Icons.spa,
                onTap: () {},
                onEdit: () {
                  // Azione modifica Cera modellante
                },
                onDelete: () {
                  // Azione elimina Cera modellante
                },
              ),
              SizedBox(height: AppColors.space),
              _productTile(
                title: "Shampoo uomo",
                icon: Icons.shower,
                onTap: () {},
                onEdit: () {
                  // Azione modifica Shampoo uomo
                },
                onDelete: () {
                  // Azione elimina Shampoo uomo
                },
              ),
              SizedBox(height: AppColors.space),
              _productTile(
                title: "Balsamo barba",
                icon: Icons.face,
                onTap: () {},
                onEdit: () {
                  // Azione modifica Balsamo barba
                },
                onDelete: () {
                  // Azione elimina Balsamo barba
                },
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.secondaryColor,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 12,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                icon: const Icon(Icons.add),
                label: const Text("Aggiungi prodotto"),
                onPressed: () {
                  // Azione aggiungi prodotto
                },
              ),
              SizedBox(width: 16),
            ],
          ),
        ),
      ],
    );
  }
}
