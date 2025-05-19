import 'package:flutter/material.dart';
import 'style.dart';
import '../salone/servizi_page.dart';
import '../salone/prenotazioni_page.dart';
import '../salone/prodotti_page.dart';
import 'profilo_page.dart';
import 'test.dart';
import '../cliente/catalogo.dart';
import '../cliente/home_cliente.dart';
import '../cliente/prenota_page.dart';


class HomePage extends StatefulWidget {
  const HomePage({super.key});
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  int _selectedIndex = 0;

  final List<Widget> _pages = const [
    HomeCliente(),
    PrenotaPage(),
    CatalogoPage(),
    ProfiloPage(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.backgroundColor,
      appBar: AppBar(
        title: Text(""),
        backgroundColor: AppColors.backgroundColor,
        toolbarHeight: 5,
      ),
      body: _pages[_selectedIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        selectedItemColor: AppColors.secondaryColor,
        unselectedItemColor: Colors.grey,
        backgroundColor: AppColors.backgroundColor,
        onTap: (index) => setState(() => _selectedIndex = index),
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.calendar_today),
            label: "Home",
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_bag),
            label: "Prenota",
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.design_services),
            label: "Catalogo",
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: "Profilo",
          ),
        ],
      ),
    );
  }
}
