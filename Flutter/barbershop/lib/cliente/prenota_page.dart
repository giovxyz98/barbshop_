import 'package:flutter/material.dart';
import '../global/style.dart';

class PrenotaPage extends StatefulWidget {
  const PrenotaPage({super.key});

  @override
  State<PrenotaPage> createState() => _PrenotaPageState();
}

class _PrenotaPageState extends State<PrenotaPage> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Prenota"),
        backgroundColor: AppColors.backgroundColor,
      ),
      body: Center(
        child: ElevatedButton(
          onPressed: () {
            // Azione per prenotare un servizio
          },
          child: const Text("Prenota un servizio"),
        ),
      ),
    );
  }
}
