import 'package:flutter/material.dart';
import 'style.dart';

class FaqPage extends StatelessWidget {
  const FaqPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("FAQ"),
        backgroundColor: AppColors.backgroundColor,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: List.generate(
          10,
          (i) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Text(
              "Domanda frequente ${i + 1}",
              style: const TextStyle(
                fontSize: 16,
                color: AppColors.primaryColor,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
