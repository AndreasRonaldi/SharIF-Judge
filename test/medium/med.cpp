#include <iostream>
#include <filesystem>
#include <fstream>
#include <string>
#include <regex>

using namespace std;

string do_replace( string const & in, string const & from, string const & to )
{
  return std::regex_replace( in, std::regex(from), to );
}

int main() {
	string inpath = "../testcase/p2/in/";
	string outpath = "../testcase/p2/out/";
	// string inpath = "./p2/in/";
	// string outpath = "./p2/out/";

	filesystem::create_directories(inpath);
	filesystem::create_directories(outpath);
	ifstream Input("med.txt");

	string strInput;
	string strOutput;
	bool output = true;
	int index = 1;

	string outType = ".txt";

	while (getline(Input, strInput) && getline(Input, strOutput))
	{
		if (strInput.rfind("//", 0) == 0) continue;

		char inpathfile[100];
		sprintf(inpathfile, "%sinput%d%s", inpath.c_str(), index, outType.c_str());
		char outpathfile[100];
		sprintf(outpathfile, "%soutput%d%s", outpath.c_str(), index, outType.c_str());

		cout << inpathfile << " " << outpathfile << "\n"; 

		ofstream In(inpathfile);
		ofstream Out(outpathfile);
		
		string temp = do_replace(strInput, ",", " ");
		temp.erase(0, 1);
		temp.erase(temp.size() - 1);

		In << temp;
		Out << strOutput;
		In.close();
		Out.close();
		index++;
	}

	return 0;
}
