import 'package:flutter/material.dart';
import 'global/home_page.dart';
import 'global/style.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

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
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
        ),
      ),
      localizationsDelegates: AppLocalizations.localizationsDelegates,
      supportedLocales: AppLocalizations.supportedLocales,

      home: const HomePage(),
    );
  }
}
