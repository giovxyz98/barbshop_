import 'package:flutter/material.dart';

import '../models/product.dart';     

class TestPage extends StatefulWidget {
  const TestPage({super.key});

  @override
  State<TestPage> createState() => _TestPageState();
}

class _TestPageState extends State<TestPage> {
  final List<Product> _products = [
    const Product('Pomade',  'assets/images/pomade.png', 3.40),
    const Product('Shampoo', 'assets/images/shampoo.png', 3.90),
    const Product('Hair Spray', 'assets/images/hairspray.png', 4.70),
    const Product('Beard Oil',  'assets/images/beardoil.png', 5.00),
  ];

  final Set<int> _selected = {}; // indici dei prodotti scelti

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        GridView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: _products.length,
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 16,
            crossAxisSpacing: 16,
            childAspectRatio: 0.78,
          ),
          itemBuilder: (context, index) {
            final product = _products[index];
            final isSelected = _selected.contains(index);

            return GestureDetector(
              onTap: () {
                setState(() {
                  isSelected ? _selected.remove(index) : _selected.add(index);
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: isSelected
                      ? AppColors.secondaryColor.withOpacity(0.27)
                      : Colors.white.withOpacity(0.06),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected ? AppColors.secondaryColor : Colors.white24,
                    width: 2,
                  ),
                  boxShadow: [
                    if (isSelected)
                      BoxShadow(
                        color: AppColors.secondaryColor.withOpacity(0.25),
                        blurRadius: 12,
                        offset: const Offset(0, 4),
                      ),
                  ],
                ),
                child: Column(
                  children: [
                    // icona rotonda
                    Container(
                      width: 64,
                      height: 64,
                      decoration: BoxDecoration(
                        color: AppColors.secondaryColor.withOpacity(0.15),
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      product.name,
                      style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w600,
                        fontSize: 16,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      '€${product.price.toStringAsFixed(2)}',
                      style: const TextStyle(
                        color: AppColors.secondaryColor,
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        ),

        if (_selected.isNotEmpty)
          Positioned(
            bottom: 24,
            left: 24,
            right: 24,
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondaryColor,
                foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                elevation: 10,
              ),
              icon: const Icon(Icons.check_circle_outline),
              label: const Text(
                'Conferma',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
              ),
              onPressed: () {
                final names = _selected.map((i) => _products[i].name).join(', ');
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    backgroundColor: AppColors.secondaryColor,
                    content: Text(
                      'Hai selezionato: $names',
                      style: const TextStyle(color: Colors.black),
                    ),
                  ),
                );
              },
            ),
          ),
      ],
    );
  }
}
