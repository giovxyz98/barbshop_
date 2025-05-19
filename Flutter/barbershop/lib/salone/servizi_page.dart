import 'package:flutter/material.dart';
import '../models/servizio.dart';
import 'add_service.dart';
import '../global/style.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

// const response = {
//   "code": 200,
//   "message": "Success",
//   "data": [
//     {"id": 100, "nome": "Taglio", "prezzo": 10, "durata": 15, "icon": "cut"},
//     {"id": 200, "nome": "Barba", "prezzo": 5, "durata": 10, "icon": "cut"},
//     {
//       "id": 300,
//       "nome": "Sopracciglia",
//       "prezzo": 3,
//       "durata": 5,
//       "icon": "cut",
//     },
//     {
//       "id": 400,
//       "nome": "Taglio + Barba",
//       "prezzo": 15,
//       "durata": 25,
//       "icon": "test",
//     },
//     {"id": 500, "nome": "Taglio + Sopracciglia", "prezzo": 13, "durata": 20},
//     {"id": 100, "nome": "Taglio", "prezzo": 10, "durata": 15, "icon": "cut"},
//     {"id": 200, "nome": "Barba", "prezzo": 5, "durata": 10, "icon": "cut"},
//     {
//       "id": 300,
//       "nome": "Sopracciglia",
//       "prezzo": 3,
//       "durata": 5,
//       "icon": "cut",
//     },
//     {"id": 100, "nome": "Taglio", "prezzo": 10, "durata": 15, "icon": "cut"},
//     {"id": 200, "nome": "Barba", "prezzo": 5, "durata": 10, "icon": "cut"},
//     {
//       "id": 300,
//       "nome": "Sopracciglia",
//       "prezzo": 3,
//       "durata": 5,
//       "icon": "cut",
//     },
//   ],
// };

class ServiziPage extends StatefulWidget {
  const ServiziPage({super.key});

  @override
  State<ServiziPage> createState() => _ServiziPageState();
}

class _ServiziPageState extends State<ServiziPage> {
  List<Servizio> servizi = [];

  @override
  void initState() {
    super.initState();
    var a = fetchServizi();
    print('\n' * 50);
    print('\n' * 50);
    print('\n' * 50);
    print("");
  }

  Future<void> fetchServizi() async {
    final response = await http.get(
      Uri.parse('http://10.0.2.2:3000/api/getServizi'),
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      setState(() {
        servizi =
            (data['data'] as List)
                .map((json) => Servizio.fromJson(json))
                .toList();
                print(data);
      });
    } else {
      // gestisci errore
    }
  }

  // Funzione per aggiungere un servizio (implementa la tua logica)
  void _addService() {
    final _nomeController = TextEditingController();
    final _prezzoController = TextEditingController();
    final _durataController = TextEditingController();

    // Lista delle icone disponibili
    final List<Map<String, dynamic>> iconOptions = [
      {"icon": Icons.cut, "key": "cut", "tooltip": "Taglio"},
      {"icon": Icons.face, "key": "face", "tooltip": "Barba"},
      {"icon": Icons.shower, "key": "shower", "tooltip": "Shampoo"},

      {
        "icon": Icons.design_services,
        "key": "design_services",
        "tooltip": "Design",
      },
    ];

    int selectedIndex = 0;

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          title: const Text(
            "Aggiungi Servizio",
            style: TextStyle(
              color: AppColors.primaryColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          content: StatefulBuilder(
            builder: (context, setState) {
              return SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.arrow_left, size: 32),
                          onPressed: () {
                            setState(() {
                              selectedIndex =
                                  (selectedIndex - 1 + iconOptions.length) %
                                  iconOptions.length;
                            });
                          },
                          tooltip: "Precedente",
                        ),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 24),
                          child: Tooltip(
                            message: iconOptions[selectedIndex]["tooltip"],
                            child: Icon(
                              iconOptions[selectedIndex]["icon"],
                              color: AppColors.secondaryColor,
                              size: 32,
                            ),
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.arrow_right, size: 32),
                          onPressed: () {
                            setState(() {
                              selectedIndex =
                                  (selectedIndex + 1) % iconOptions.length;
                            });
                          },
                          tooltip: "Successivo",
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _nomeController,
                      decoration: const InputDecoration(
                        labelText: "Nome servizio",
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _prezzoController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: "Prezzo (€)",
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _durataController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: "Durata (min)",
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Annulla"),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.secondaryColor,
                foregroundColor: Colors.black,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: () {
                final nome = _nomeController.text.trim();
                final prezzo = int.tryParse(_prezzoController.text.trim());
                final durata = int.tryParse(_durataController.text.trim());

                if (nome.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text(
                        "Il nome del servizio non può essere vuoto",
                      ),
                      backgroundColor: AppColors.error,
                    ),
                  );
                  return;
                }
                if (prezzo == null || prezzo <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Inserisci un prezzo valido"),
                      backgroundColor: AppColors.error,
                    ),
                  );
                  return;
                }
                if (durata == null || durata <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text("Inserisci una durata valida"),
                      backgroundColor: AppColors.error,
                    ),
                  );
                  return;
                }

                setState(() {
                  servizi.add(
                    Servizio(
                      id: servizi.length + 1,
                      nome: nome,
                      prezzo: prezzo,
                      durata: durata,
                      icon: iconOptions[selectedIndex]["key"],
                    ),
                  );
                });
                Navigator.pop(context);
              },
              child: const Text("Salva"),
            ),
          ],
        );
      },
    );
  }

  IconData _getIconForService(String icon) {
    switch (icon) {
      case "cut":
        return Icons.cut;
      case "face":
        return Icons.face;
      // aggiungi altri case per le icone
      default:
        return Icons.design_services;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: servizi.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final servizio = servizi[index];
              return AddService(
                title: servizio.nome,
                icon: _getIconForService(servizio.icon),
                prezzo: servizio.prezzo,
                durata: servizio.durata,
                onEdit: () {},
                onDelete: () {},
              );
            },
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.secondaryColor,
              foregroundColor: Colors.black,
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            icon: const Icon(Icons.add),
            label: const Text("Aggiungi servizio"),
            onPressed: _addService,
          ),
        ),
      ],
    );
  }
}
