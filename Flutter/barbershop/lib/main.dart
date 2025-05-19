import 'package:flutter/material.dart';
import 'global/home_page.dart';
import 'global/style.dart';

void main() {
  runApp(const BarbshopApp());
}



class BarbshopApp extends StatelessWidget {
  const BarbshopApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Barbshop',
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.textColor,
        appBarTheme: const AppBarTheme(
          backgroundColor: AppColors.black,
          foregroundColor: Colors.white,
        ),
      ),
      home: const HomePage(),
    );
  }
}







